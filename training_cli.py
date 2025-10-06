#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Third Eye Overseer — Azure ML CLI (local-first)
- Two teachers (general + coder): reasoning (<think>) + JSON envelope capture
- Clean/dedup prompts from 4 CSVs in /mnt/data
- Dry-run (JSON gate), Label+Augment (resume + checkpoints)
- Student FT: QLoRA (default) or FULL (toggle)
- Merge LoRA → full student
- Export/Quantize: HF full + AWQ 4-bit + (attempt) GGUF Q4/Q5/Q8
- Summaries: dataset distribution, invariants, latency, reasoning length

Author: you
"""

from __future__ import annotations
import os, sys, site, subprocess, time, json, re, unicodedata, math
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Any, Optional
from getpass import getpass

# ------------------------- Azure ML paths -------------------------
BASE   = Path("/mnt/data")
ROOT   = BASE / "third_eye_overseer"
PKGDIR = BASE / "overseer_pkgs"
DATAD  = ROOT / "data"
LOGSD  = ROOT / "logs"
CKPTS  = ROOT / "student_ckpts"
OUTD   = ROOT / "out"
for d in [ROOT, PKGDIR, DATAD, LOGSD, CKPTS, OUTD]: d.mkdir(parents=True, exist_ok=True)

# Prefer isolated site-packages over AML system libs
if str(PKGDIR) not in sys.path:
    sys.path.insert(0, str(PKGDIR))
    site.addsitedir(str(PKGDIR))

# ------------------------- Configuration -------------------------
@dataclass
class Config:
    # Teachers
    general_teacher: str = "Qwen/Qwen3-30B-A3B-Instruct-2507"
    coder_teacher:   str = "Qwen3-Coder-30B-A3B-Instruct-FP8"            # if 401, try "Qwen/Qwen3-Coder-30B-A3B-Instruct-FP8"
    coder_fallback:  str = "deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct"
    # Student
    student_id:      str = "Qwen/Qwen3-4B-Instruct-2507"                 # or "Qwen/Qwen3-1.7B-Instruct-2507"
    training_mode:   str = "qlora"                                       # "qlora" or "full"
    use_eye_tag:     bool = True                                         # prepend [EYE: …] in training inputs
    # 4 CSV files in /mnt/data
    english1: Path = BASE / "EnglishPrompts.csv"
    arabic1:  Path = BASE / "ArabicsPrompts.csv"
    english2: Path = BASE / "EnPrompt.csv"     # (act, prompt)
    arabic2:  Path = BASE / "PromptAR.csv"     # (Subject, Prompts)
    # Outputs
    prompts_clean_csv:   Path = DATAD / "prompts_clean.csv"
    prompts_clean_jsonl: Path = DATAD / "prompts_clean.jsonl"
    dataset_jsonl:       Path = DATAD / "overseer_distill_dataset.jsonl"
    seen_file:           Path = DATAD / "seen_prompts.txt"
    report_md:           Path = OUTD  / "dataset_summary.md"
    report_json:         Path = OUTD  / "dataset_summary.json"
    # Distillation knobs
    dryrun_samples: int = 2
    max_new_tokens: int = 600
    save_every: int     = 50
    early_stop: int     = 30
    aug_per_prompt: int = 2
    # Student SFT knobs
    sft_epochs: int     = 1
    per_device_bsz: int = 2
    grad_accum: int     = 8
    lr: float           = 2e-4
    max_seq_len: int    = 2048
    # Export/Quantize
    gguf_do: bool       = True         # try GGUF export (best-effort)
    gguf_types: List[str] = None       # None → default set below

CFG = Config()
if CFG.gguf_types is None:
    CFG.gguf_types = ["Q4_K_M", "Q5_K_M", "Q8_0"]   # add/remove as you like

# ------------------------- Isolated installs -------------------------
def ensure_pkgs():
    pkgs = [
        "transformers>=4.46.0", "accelerate>=0.33.0", "peft>=0.11.1", "trl>=0.9.4",
        "bitsandbytes>=0.43.1", "datasets>=2.20.0",
        "sentencepiece", "safetensors", "orjson", "pandas", "tqdm", "einops",
        "huggingface_hub>=0.24.6", "ipywidgets>=8.1.2", "jupyterlab_widgets>=3.0.10",
        "autoawq>=0.2.5"   # AWQ 4-bit quantization
    ]
    cmd = [sys.executable, "-m", "pip", "install", "-q", "--upgrade", "--target", str(PKGDIR)] + pkgs
    print("Installing LLM deps into", PKGDIR, "…")
    subprocess.check_call(cmd)
    if str(PKGDIR) not in sys.path:
        sys.path.insert(0, str(PKGDIR)); site.addsitedir(str(PKGDIR))

def safe_imports():
    global torch, tqdm, pd, orjson
    global AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
    global TrainingArguments, DataCollatorForLanguageModeling
    global SFTTrainer
    global login
    import torch
    from tqdm.auto import tqdm
    import pandas as pd
    import orjson
    from transformers import (AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig,
                              TrainingArguments, DataCollatorForLanguageModeling)
    from trl import SFTTrainer
    from huggingface_hub import login

# ------------------------- Cleaning/dedup -------------------------
PROMPT_KEYS = ["Prompt","prompt","Prompts","prompts","text","Text","instruction","content","user","User","message","Message"]
MIN_LEN, MAX_LEN = 6, 2000
CTRL = re.compile(r"[\u0000-\u001F\u007F\u200B-\u200D\u2060\uFEFF]")
WS   = re.compile(r"\s+")

def clean_text(s: str) -> str:
    s = unicodedata.normalize("NFKC", str(s))
    s = CTRL.sub("", s).replace("\r","\n")
    s = re.sub(r"[ \t]+"," ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()

def canonical_key(s: str) -> str:
    s0 = unicodedata.normalize("NFKC", s)
    s0 = CTRL.sub("", s0)
    s0 = re.sub(r"\(variation\s+\d+\)$", "", s0, flags=re.IGNORECASE).strip()
    s0 = WS.sub(" ", s0)
    return s0.casefold()

def choose_prompt_column(df) -> str:
    for k in PROMPT_KEYS:
        if k in df.columns: return k
    scores = [(df[c].astype(str).str.len().median(), c) for c in df.columns]
    scores.sort(reverse=True)
    return scores[0][1]

def load_csv_prompts(path: Path) -> List[str]:
    import pandas as pd
    try: df = pd.read_csv(path)
    except Exception: df = pd.read_csv(path, encoding="latin-1")
    col = choose_prompt_column(df)
    return df[col].astype(str).dropna().tolist()

def run_clean_prompts() -> List[str]:
    print("Loading & cleaning /mnt/data CSVs …")
    files = [CFG.english1, CFG.arabic1, CFG.english2, CFG.arabic2]
    raw = []
    for fp in files:
        if not fp.exists(): print(f"⚠ Missing: {fp}"); continue
        batch = load_csv_prompts(fp)
        print(f"  {fp.name}: {len(batch)} rows"); raw.extend(batch)
    cleaned, rm_empty, rm_short, rm_long = [], 0,0,0
    for s in raw:
        t = clean_text(s)
        if not t: rm_empty+=1; continue
        L = len(t)
        if L<MIN_LEN: rm_short+=1; continue
        if L>MAX_LEN: rm_long+=1; continue
        cleaned.append(t)
    uniq = {}
    for t in cleaned:
        k = canonical_key(t)
        if k not in uniq: uniq[k]=t
    prompts = list(uniq.values())
    import pandas as pd
    pd.DataFrame({"Prompt": prompts}).to_csv(CFG.prompts_clean_csv, index=False)
    with open(CFG.prompts_clean_jsonl,"w",encoding="utf-8") as f:
        for p in prompts: f.write(orjson.dumps({"Prompt": p}).decode()+"\n")
    print(f"✅ Cleaned: {len(cleaned)} | Deduped: {len(prompts)}")
    print("Saved:", CFG.prompts_clean_csv, "and", CFG.prompts_clean_jsonl)
    return prompts

# ------------------------- Persona (FULL) -------------------------
FULL_PERSONA = r"""
You are the 🧿 Third Eye Overseer.

Your purpose is to analyze any input and decide which *Eye* should respond.
Each Eye has a specialized role and output schema.
You must:

1. Select the correct Eye based on the user request.
2. Produce a **valid JSON envelope** using that Eye’s schema.
3. Never output anything outside JSON.

If no Eye fits, return a PROMPT_HELPER envelope with an explanation.

--- (Eye directory redacted here for brevity; include your full text) ---

### 🧩 Output Rules
- Always start with `{` and end with `}` — valid JSON only.
- Choose exactly one Eye per response.
- Never mix Eyes in the same envelope.
- Fill every required field; if unknown, use empty string "".
- **No explanations or markdown outside JSON.**
"""

# ------------------------- Chat templating & extraction -------------------------
def apply_template(tok, messages, add_generation_prompt=True):
    if hasattr(tok, "apply_chat_template"):
        return tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=add_generation_prompt)
    parts=[]
    for m in messages:
        parts.append(f"<|im_start|>{m['role']}\n{m['content']}<|im_end|>\n")
    if add_generation_prompt: parts.append("<|im_start|>assistant\n")
    return "".join(parts)

def extract_reasoning_and_json(text: str) -> Dict[str,Any]:
    reasoning = ""
    m_think = re.search(r"<think>(.*?)</think>", text, re.S)
    if m_think: reasoning = m_think.group(1).strip()
    s = text.find("{"); parsed=None
    if s != -1:
        depth=0
        for i,ch in enumerate(text[s:], start=s):
            if ch=="{": depth+=1
            elif ch=="}":
                depth-=1
                if depth==0:
                    cand=text[s:i+1]
                    try: parsed=orjson.loads(cand)
                    except Exception: parsed=None
                    break
    return {"reasoning": reasoning, "json": parsed}

# --------------- Teacher routing (general vs coder) ---------------
tok_general = model_general = None
tok_coder   = model_coder   = None

def load_general_teacher():
    global tok_general, model_general
    if tok_general is None or model_general is None:
        from transformers import AutoTokenizer, AutoModelForCausalLM
        print("Loading general teacher:", CFG.general_teacher)
        tok_general = AutoTokenizer.from_pretrained(CFG.general_teacher, trust_remote_code=True)
        model_general = AutoModelForCausalLM.from_pretrained(
            CFG.general_teacher, device_map="auto",
            torch_dtype=__import__('torch').bfloat16 if __import__('torch').cuda.is_available() else __import__('torch').float32,
            trust_remote_code=True
        ); model_general.eval()
        print("General teacher device:", model_general.device)
    return tok_general, model_general

def load_coder_teacher():
    global tok_coder, model_coder
    from transformers import AutoTokenizer, AutoModelForCausalLM
    if tok_coder is not None and model_coder is not None: return tok_coder, model_coder
    try:
        print("Loading coder teacher:", CFG.coder_teacher)
        tok_coder = AutoTokenizer.from_pretrained(CFG.coder_teacher, trust_remote_code=True)
        model_coder = AutoModelForCausalLM.from_pretrained(
            CFG.coder_teacher, device_map="auto",
            torch_dtype=__import__('torch').bfloat16 if __import__('torch').cuda.is_available() else __import__('torch').float32,
            trust_remote_code=True
        ); model_coder.eval()
    except Exception as e:
        print("Coder teacher failed:", str(e)[:200]); print("Trying fallback:", CFG.coder_fallback)
        tok_coder = AutoTokenizer.from_pretrained(CFG.coder_fallback, trust_remote_code=True)
        model_coder = AutoModelForCausalLM.from_pretrained(
            CFG.coder_fallback, device_map="auto",
            torch_dtype=__import__('torch').bfloat16 if __import__('torch').cuda.is_available() else __import__('torch').float32,
            trust_remote_code=True
        ); model_coder.eval()
    print("Coder teacher device:", model_coder.device)
    return tok_coder, model_coder

CODE_HINTS = ["code","bug","fix","function","class","method","api","endpoint","diff","tests","unit test","pytest","jest","scaffold","refactor","compile","build","ci","lint","coverage","rollback","module","package"]
def is_code_prompt(p: str) -> bool:
    t=p.lower(); return any(k in t for k in CODE_HINTS)

def ask_teacher(prompt_text: str, eye_hint: Optional[str]=None, max_new: Optional[int]=None) -> Dict[str,Any]:
    max_new = max_new or CFG.max_new_tokens
    use_coder = (eye_hint and eye_hint.upper().startswith("MANGEKYO")) or is_code_prompt(prompt_text)
    if use_coder:
        tokX, mdl = load_coder_teacher()
        persona = FULL_PERSONA + "\n\nFor code tasks, keep <think> under ~50 tokens, then output ONE JSON."
        teacher_id = CFG.coder_teacher
    else:
        tokX, mdl = load_general_teacher()
        persona = FULL_PERSONA + "\n\nReturn ONLY one valid JSON object."
        teacher_id = CFG.general_teacher
    messages = [{"role":"system","content": persona},{"role":"user","content": f"PROMPT: {prompt_text}"}]
    chat = apply_template(tokX, messages, add_generation_prompt=True)
    inputs = tokX(chat, return_tensors="pt").to(mdl.device)
    t0=time.time()
    with __import__('torch').inference_mode():
        out = mdl.generate(**inputs, max_new_tokens=max_new, do_sample=False, temperature=0.0,
                           pad_token_id=tokX.eos_token_id, eos_token_id=tokX.eos_token_id)
    raw = tokX.decode(out[0], skip_special_tokens=False)
    elapsed = round(time.time()-t0, 2)
    res = extract_reasoning_and_json(raw)
    res.update({"raw": raw, "teacher_id": teacher_id, "elapsed_s": elapsed})
    return res

# ------------------------- Distillation labels & invariants -------------------------
AR_RE = re.compile(r"[\u0600-\u06FF]")
def detect_lang(s: str) -> str: return "ar" if AR_RE.search(s) else "en"

def apply_invariants(rec: dict):
    inv = {}
    env = rec["envelope"]
    tag, ok, code, data = env.get("tag",""), env.get("ok"), env.get("code",""), env.get("data",{})

    def req(key): return key in data and isinstance(data[key], str) and data[key].strip() != ""

    if tag == "SHARINGAN" and code == "E_AMBIGUOUS":
        env["ok"] = False; inv["sharingan_ok_false_on_ambiguous"] = True

    if tag == "PROMPT_HELPER":
        inv["prompt_helper_has_prompt_md"] = bool(data.get("prompt_md"))

    if tag == "JOGAN" and ok is True:
        inv["jogan_confirm_has_no_missing"] = bool(data.get("intent_confirmed", False)) and not data.get("missing_fields")

    if tag == "RINNEGAN_PLAN_REQ":
        inv["rinnegan_req_has_schema"] = req("expected_schema_md") and req("acceptance_criteria_md")

    if tag == "RINNEGAN_PLAN_REVIEW" and ok is False:
        inv["rinnegan_review_has_issues_and_fixes"] = req("issues_md") and req("fix_instructions_md")

    if tag == "TENSEIGAN":
        if code == "OK_EVIDENCE_FOUND": inv["tenseigan_has_citations"] = req("citations_md")
        if code == "E_CITATIONS_MISSING": env["ok"] = False; inv["tenseigan_ok_false_on_missing"] = True

    if tag == "BYAKUGAN" and code == "E_CONTRADICTION_DETECTED":
        env["ok"] = False; inv["byakugan_ok_false_on_contradiction"] = True

    if tag == "MANGEKYO":
        inv["mangekyo_has_checklist"] = req("checklist_md")
        inv["mangekyo_has_fix_instructions"] = req("fix_instructions_md")
        if data.get("approved") is True:
            env["ok"] = True; env["code"] = "OK_IMPL_APPROVED"
        else:
            env["ok"] = False; env["code"] = "E_IMPL_ISSUES"

    rec["invariant_checks"] = inv

def make_labeled_record(prompt: str, teacher_res: dict) -> Optional[dict]:
    env = teacher_res["json"]
    if not env: return None
    rec = {
        "prompt": prompt,
        "eye_hint": None,
        "teacher_id": teacher_res["teacher_id"],
        "teacher_type": "coder" if ("Coder" in teacher_res["teacher_id"] or "DeepSeek" in teacher_res["teacher_id"]) else "general",
        "elapsed_s": teacher_res["elapsed_s"],
        "lang": detect_lang(prompt),
        "reasoning_md": teacher_res["reasoning"],
        "envelope": env,
        "eye_tag": env.get("tag",""),
        "json_valid": True,
        "is_code": is_code_prompt(prompt),
        "split": "train",
        "weight": 1.0,
        "ts": int(time.time())
    }
    apply_invariants(rec)
    return rec

# ------------------------- Student dataset -------------------------
def build_sft_messages(rec: dict, eye_tagging: bool=True) -> List[dict]:
    think = (rec.get("reasoning_md","") or "").strip()
    env   = {k: rec["envelope"][k] for k in ["tag","ok","code","md","data","next"] if k in rec["envelope"]}
    eye   = (rec.get("eye_tag","") or "").upper()
    eye_hint = f"[EYE: {eye}] " if (CFG.use_eye_tag and eye_tagging and eye) else ""
    assistant = f"<think>\n{think}\n</think>\n\n{json.dumps(env, ensure_ascii=False)}"
    return [
        {"role":"system","content":"You are the 🧿 Third Eye Overseer. Think first (<think>…</think>), then output ONE JSON envelope."},
        {"role":"user","content": f"{eye_hint}PROMPT: {rec.get('prompt','')}"},
        {"role":"assistant","content": assistant}
    ]

# ------------------------- Summary report -------------------------
def action_summary():
    import orjson, pandas as pd
    if not CFG.dataset_jsonl.exists():
        print("Dataset not found:", CFG.dataset_jsonl); return
    rows = [orjson.loads(l) for l in open(CFG.dataset_jsonl,"r",encoding="utf-8")]
    if not rows:
        print("Dataset empty."); return

    # Core aggregates
    total = len(rows)
    per_eye = {}
    per_lang = {"ar":0,"en":0}
    per_teacher = {}
    latency = []
    think_len = []
    inv_fail = {}

    for r in rows:
        env = r.get("envelope", {})
        tag = (env.get("tag") or r.get("eye_tag") or "").upper()
        per_eye[tag] = per_eye.get(tag,0)+1
        lang = r.get("lang","en"); per_lang[lang] = per_lang.get(lang,0)+1
        tid = r.get("teacher_id","?"); per_teacher[tid] = per_teacher.get(tid,0)+1
        latency.append(r.get("elapsed_s",0.0))
        think_len.append(len(r.get("reasoning_md","")))
        inv = r.get("invariant_checks",{})
        for k,v in inv.items():
            if v is True: inv_fail[k] = inv_fail.get(k,0)+1

    import numpy as np
    def s(x):
        return {
            "mean": float(np.mean(x)) if x else 0.0,
            "p50":  float(np.median(x)) if x else 0.0,
            "p90":  float(np.percentile(x,90)) if x else 0.0,
            "max":  float(np.max(x)) if x else 0.0
        }
    lat = s(latency); thk = s(think_len)

    summary = {
        "total_rows": total,
        "per_eye": per_eye,
        "per_lang": per_lang,
        "per_teacher": per_teacher,
        "latency_s": lat,
        "reasoning_chars": thk,
        "invariant_hits": inv_fail
    }
    # Save JSON
    CFG.report_json.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    # Save Markdown
    md = ["# Overseer Distillation — Dataset Summary",
          f"- Total rows: **{total}**",
          "## Per Eye",
          *[f"- {k}: {v}" for k,v in sorted(per_eye.items())],
          "## Per Language",
          *[f"- {k}: {v}" for k,v in per_lang.items()],
          "## Per Teacher",
          *[f"- {k}: {v}" for k,v in per_teacher.items()],
          "## Latency (s)", f"- mean: {lat['mean']:.2f} | p50: {lat['p50']:.2f} | p90: {lat['p90']:.2f} | max: {lat['max']:.2f}",
          "## Reasoning length (chars)", f"- mean: {thk['mean']:.0f} | p50: {thk['p50']:.0f} | p90: {thk['p90']:.0f} | max: {thk['max']:.0f}",
          "## Invariant checks (true hits)",
          *[f"- {k}: {v}" for k,v in sorted(inv_fail.items())]
         ]
    CFG.report_md.write_text("\n".join(md), encoding="utf-8")
    print("✅ Wrote summary:", CFG.report_md, "and", CFG.report_json)

# ------------------------- Export & Quantize -------------------------
def action_export_quant():
    """
    Export the trained student in multiple formats:
      - HF full (merged) if LoRA exists
      - AWQ 4-bit (AutoAWQ)
      - GGUF (attempt): f16 + Q4_K_M / Q5_K_M / Q8_0
    """
    from transformers import AutoTokenizer, AutoModelForCausalLM
    import shutil, subprocess

    # 1) Ensure merged HF exists
    merged_dir = OUTD / "student_merged"
    lora_dir   = OUTD / "student_lora_final"
    if not merged_dir.exists():
        if not lora_dir.exists():
            print("No LoRA or merged model found. Train first."); return
        print("Merging LoRA → full HF checkpoint …")
        try:
            from peft import PeftModel
            base = AutoModelForCausalLM.from_pretrained(CFG.student_id, device_map="auto",
                        torch_dtype=__import__('torch').bfloat16, trust_remote_code=True)
            merged = PeftModel.from_pretrained(base, str(lora_dir)).merge_and_unload()
            merged_dir.mkdir(parents=True, exist_ok=True)
            merged.save_pretrained(str(merged_dir), safe_serialization=True)
            tok_s = AutoTokenizer.from_pretrained(CFG.student_id, trust_remote_code=True)
            tok_s.save_pretrained(str(merged_dir))
        except Exception as e:
            print("Merge failed:", e); return
    print("HF merged model at:", merged_dir)

    # 2) AWQ 4-bit quantization (fast)
    try:
        print("AWQ 4-bit quantization …")
        from awq import AutoAWQForCausalLM
        tok = AutoTokenizer.from_pretrained(str(merged_dir), trust_remote_code=True)
        m   = AutoAWQForCausalLM.from_pretrained(str(merged_dir), fuse_layers=True, trust_remote_code=True)
        quant_dir = OUTD / "student_awq_w4g128"
        quant_dir.mkdir(parents=True, exist_ok=True)
        m.quantize(tok, quant_config={"zero_point": True, "q_group_size": 128, "w_bit": 4, "version": "GEMM"})
        m.save_quantized(str(quant_dir), safetensors=True)
        tok.save_pretrained(str(quant_dir))
        print("✅ AWQ saved:", quant_dir)
    except Exception as e:
        print("⚠️ AWQ quantization skipped:", e)

    # 3) GGUF export (best-effort)
    if not CFG.gguf_do:
        print("GGUF export disabled."); return

    try:
        llama_dir = OUTD / "llama.cpp"
        if not llama_dir.exists():
            print("Cloning llama.cpp …")
            subprocess.check_call(["git","clone","--depth","1","https://github.com/ggerganov/llama.cpp", str(llama_dir)])

        # Convert to f16 GGUF
        gguf_dir = OUTD / "gguf"
        gguf_dir.mkdir(exist_ok=True, parents=True)
        f16_path = gguf_dir / "student-f16.gguf"
        print("Converting HF → GGUF (f16) …")
        subprocess.check_call([sys.executable, str(llama_dir/"convert-hf-to-gguf.py"),
                               "--model", str(merged_dir), "--outfile", str(f16_path), "--outtype", "f16"])

        # Try to build quantize binary
        qbin = llama_dir / "quantize"
        if not qbin.exists():
            print("Building quantize binary (cmake)…")
            build_dir = llama_dir / "build"
            build_dir.mkdir(exist_ok=True)
            subprocess.check_call(["cmake","-B",str(build_dir),"-S",str(llama_dir)])
            subprocess.check_call(["cmake","--build",str(build_dir),"-j"])
            # locate quantize
            qfound = list(build_dir.rglob("quantize"))
            if qfound: qbin = qfound[0]

        if not qbin.exists():
            print("⚠️ quantize binary not found; GGUF f16 is ready. You can quantize offline.")
            return

        # Quantize to requested types
        for qt in CFG.gguf_types:
            outp = gguf_dir / f"student.{qt}.gguf"
            print(f"Quantizing → {qt} …")
            subprocess.check_call([str(qbin), str(f16_path), str(outp), qt])
            print("  saved:", outp)

        print("✅ GGUF export complete:", gguf_dir)
    except Exception as e:
        print("⚠️ GGUF export failed:", e)
        print("You still have HF merged and AWQ 4-bit artifacts in:", OUTD)

# ------------------------- Training & Eval -------------------------
from typing import List
def messages_to_text_student(messages, tok):
    if hasattr(tok,"apply_chat_template"):
        return tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
    parts=[]; 
    for m in messages: parts.append(f"<|im_start|>{m['role']}\n{m['content']}<|im_end|>\n")
    return "".join(parts)

def action_setup():
    ensure_pkgs()
    safe_imports()
    print("✅ Packages installed under:", PKGDIR)

def action_hf_login():
    from huggingface_hub import login
    token = os.getenv("HUGGINGFACE_HUB_TOKEN") or getpass("Paste HF token (read): ")
    os.environ["HUGGINGFACE_HUB_TOKEN"] = token
    try: login(token=token); print("✅ HF login OK")
    except Exception as e: print("⚠️ HF login error:", e)

def action_clean():
    safe_imports()
    global PROMPTS
    PROMPTS = run_clean_prompts()
    print("PROMPTS:", len(PROMPTS))

def action_dryrun():
    safe_imports()
    import pandas as pd
    if not PROMPTS and CFG.prompts_clean_csv.exists():
        PROMPTS[:] = pd.read_csv(CFG.prompts_clean_csv)["Prompt"].astype(str).tolist()
    tests = PROMPTS[:CFG.dryrun_samples] if PROMPTS else [
        "تحدث عن إنجازات علماء الفلك المسلمين مثل البيروني والخوارزمي",
        "Explain exponential backoff with jitter for a notification service."
    ]
    ok=0
    for p in tests:
        res = ask_teacher(p)
        print("\nPROMPT:", p[:160], "| teacher:", res["teacher_id"], "| ⏱", res["elapsed_s"], "s")
        if res["reasoning"]: print("🧠", res["reasoning"][:300].replace("\n"," ") + ("..." if len(res["reasoning"])>300 else ""))
        if res["json"]: print("✅ keys:", list(res["json"].keys())); ok+=1
        else: print("❌ Invalid JSON excerpt:", res["raw"][:500], "…")
    if ok==0: print("❌ Dry-run failed. Do not continue.")

def action_label():
    safe_imports()
    import pandas as pd, orjson
    if not PROMPTS and CFG.prompts_clean_csv.exists():
        PROMPTS[:] = pd.read_csv(CFG.prompts_clean_csv)["Prompt"].astype(str).tolist()
    if not PROMPTS: print("No prompts. Run [3] Clean first."); return

    seen = set()
    if CFG.seen_file.exists():
        seen = {ln.strip() for ln in CFG.seen_file.read_text(encoding="utf-8").splitlines() if ln.strip()}
    saved = 0; bad_consec = 0
    from tqdm.auto import tqdm
    with open(CFG.dataset_jsonl,"a",encoding="utf-8") as outf, open(CFG.seen_file,"a",encoding="utf-8") as seenf:
        for p in tqdm(PROMPTS, desc="Labeling"):
            if p in seen: continue
            res = ask_teacher(p)
            rec = make_labeled_record(p, res)
            if rec:
                outf.write(orjson.dumps(rec).decode()+"\n")
                seenf.write(p+"\n"); seen.add(p); saved+=1; bad_consec=0
            else:
                bad_consec+=1
                if bad_consec>=CFG.early_stop: print("Too many invalids — stopping."); break
            for n in range(CFG.aug_per_prompt):
                aug = f"{p} (variation {n+1})"
                res2 = ask_teacher(aug)
                rec2 = make_labeled_record(aug, res2)
                if rec2: outf.write(orjson.dumps(rec2).decode()+"\n"); saved+=1; bad_consec=0
                else:
                    bad_consec+=1
                    if bad_consec>=CFG.early_stop: print("Too many invalids — stopping."); break
            if saved and saved % CFG.save_every == 0:
                outf.flush(); seenf.flush(); os.fsync(outf.fileno()); os.fsync(seenf.fileno())
    print("Saved:", saved, "rows →", CFG.dataset_jsonl)

def action_toggle_mode():
    CFG.training_mode = "full" if CFG.training_mode == "qlora" else "qlora"
    print("Training mode →", CFG.training_mode.upper())

def action_train():
    safe_imports()
    import orjson
    if not CFG.dataset_jsonl.exists(): print("Dataset not found:", CFG.dataset_jsonl); return
    rows = [orjson.loads(l) for l in open(CFG.dataset_jsonl,"r",encoding="utf-8")]
    msgs = [build_sft_messages(r) for r in rows if ("envelope" in r and all(k in r["envelope"] for k in ["tag","ok","code","md","data","next"]))]
    print("Records for SFT:", len(msgs))
    if not msgs: print("No valid records."); return

    from transformers import AutoTokenizer, AutoModelForCausalLM, DataCollatorForLanguageModeling, TrainingArguments
    from trl import SFTTrainer
    tok_s = AutoTokenizer.from_pretrained(CFG.student_id, trust_remote_code=True)
    if tok_s.pad_token is None: tok_s.pad_token = tok_s.eos_token

    def messages_to_text(messages):
        if hasattr(tok_s,"apply_chat_template"):
            return tok_s.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
        parts=[]; 
        for m in messages: parts.append(f"<|im_start|>{m['role']}\n{m['content']}<|im_end|>\n")
        return "".join(parts)

    texts = [{"text": messages_to_text(m)} for m in msgs]
    from datasets import Dataset
    ds = Dataset.from_list(texts).train_test_split(test_size=0.05, seed=42)

    coll = DataCollatorForLanguageModeling(tokenizer=tok_s, mlm=False)
    args = TrainingArguments(
        output_dir=str(CKPTS),
        per_device_train_batch_size=CFG.per_device_bsz,
        gradient_accumulation_steps=CFG.grad_accum,
        learning_rate=CFG.lr,
        num_train_epochs=CFG.sft_epochs,
        warmup_ratio=0.03,
        logging_steps=20,
        save_steps=200, save_total_limit=3,
        evaluation_strategy="steps", eval_steps=200,
        bf16=True if __import__('torch').cuda.is_available() else False,
        gradient_checkpointing=True, report_to="none",
    )

    if CFG.training_mode.lower() == "qlora":
        print("▶ QLoRA")
        from transformers import BitsAndBytesConfig
        from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
        bnb = BitsAndBytesConfig(
            load_in_4bit=True, bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=__import__('torch').bfloat16
        )
        student = AutoModelForCausalLM.from_pretrained(
            CFG.student_id, device_map="auto",
            torch_dtype=__import__('torch').bfloat16,
            quantization_config=bnb, trust_remote_code=True
        )
        student = prepare_model_for_kbit_training(student); student.gradient_checkpointing_enable()
        lora = LoraConfig(r=32, lora_alpha=16, lora_dropout=0.05, bias="none",
                          target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"])
        student = get_peft_model(student, lora); student.print_trainable_parameters()
        trainer = SFTTrainer(model=student, tokenizer=tok_s,
                             train_dataset=ds["train"], eval_dataset=ds["test"],
                             dataset_text_field="text", max_seq_length=CFG.max_seq_len,
                             data_collator=coll, args=args)
        trainer.train()
        out = OUTD / "student_lora_final"
        trainer.save_model(str(out)); tok_s.save_pretrained(str(out))
        print("Saved LoRA:", out)
    else:
        print("▶ FULL fine-tune")
        student = AutoModelForCausalLM.from_pretrained(
            CFG.student_id, device_map="auto",
            torch_dtype=__import__('torch').bfloat16, trust_remote_code=True
        )
        student.gradient_checkpointing_enable()
        trainer = SFTTrainer(model=student, tokenizer=tok_s,
                             train_dataset=ds["train"], eval_dataset=ds["test"],
                             dataset_text_field="text", max_seq_length=CFG.max_seq_len,
                             data_collator=coll, args=args)
        trainer.train()
        out = OUTD / "student_full_ft"
        trainer.save_model(str(out)); tok_s.save_pretrained(str(out))
        print("Saved FULL FT model:", out)

def action_merge():
    safe_imports()
    from transformers import AutoTokenizer, AutoModelForCausalLM
    from peft import PeftModel
    out = OUTD / "student_lora_final"
    if not out.exists(): print("LoRA not found:", out); return
    try:
        base = AutoModelForCausalLM.from_pretrained(CFG.student_id, device_map="auto",
                    torch_dtype=__import__('torch').bfloat16, trust_remote_code=True)
        merged = PeftModel.from_pretrained(base, str(out)).merge_and_unload()
        dest = OUTD / "student_merged"; dest.mkdir(exist_ok=True)
        merged.save_pretrained(str(dest), safe_serialization=True)
        tok_s = AutoTokenizer.from_pretrained(CFG.student_id, trust_remote_code=True)
        tok_s.save_pretrained(str(dest))
        print("Merged full student saved:", dest)
    except Exception as e:
        print("Merge failed:", e)

def action_eval():
    safe_imports()
    from transformers import AutoTokenizer, AutoModelForCausalLM
    tok_s = AutoTokenizer.from_pretrained(CFG.student_id, trust_remote_code=True)
    if tok_s.pad_token is None: tok_s.pad_token = tok_s.eos_token
    try:
        dest = OUTD / "student_merged"
        if dest.exists():
            mdl = AutoModelForCausalLM.from_pretrained(str(dest), device_map="auto",
                    torch_dtype=__import__('torch').bfloat16, trust_remote_code=True)
        else:
            mdl = AutoModelForCausalLM.from_pretrained(CFG.student_id, device_map="auto",
                    torch_dtype=__import__('torch').bfloat16, trust_remote_code=True)
    except Exception as e:
        print("Load student failed:", e); return

    def apply_template(tok, messages, add_generation_prompt=True):
        if hasattr(tok, "apply_chat_template"):
            return tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=add_generation_prompt)
        parts=[]; 
        for m in messages: parts.append(f"<|im_start|>{m['role']}\n{m['content']}<|im_end|>\n")
        if add_generation_prompt: parts.append("<|im_start|>assistant\n")
        return "".join(parts)

    tests = [
        "Build a test plan for the invoice API with retries and rollback.",
        "Python is the most popular language in 2025—verify with citations."
    ]
    for p in tests:
        eye_prefix = "[EYE: MANGEKYO] " if is_code_prompt(p) else ""
        messages = [
            {"role":"system","content":"You are the 🧿 Third Eye Overseer. Think briefly in <think>, then output ONE JSON envelope."},
            {"role":"user","content": f"{eye_prefix}PROMPT: {p}"}
        ]
        chat = apply_template(tok_s, messages, add_generation_prompt=True)
        inputs = tok_s(chat, return_tensors="pt").to(mdl.device)
        with __import__('torch').inference_mode():
            out = mdl.generate(**inputs, max_new_tokens=350, do_sample=False, temperature=0.0,
                               pad_token_id=tok_s.eos_token_id, eos_token_id=tok_s.eos_token_id)
        dec = tok_s.decode(out[0], skip_special_tokens=False)
        res = extract_reasoning_and_json(dec)
        print("\nPROMPT:", p)
        print("🧠", (res["reasoning"] or "")[:300])
        print("✅", res["json"])

# ------------------------- Menu -------------------------
MENU = """
🧿 Third Eye Overseer — Azure ML CLI
[1] Setup isolated environment (installs into /mnt/data/overseer_pkgs)
[2] Hugging Face login
[3] Clean & deduplicate prompts (4 CSVs in /mnt/data)
[4] Dry-run (2 prompts) — verify JSON
[5] Label & augment (resume + checkpoints)
[6] Train student (QLO﻿RA)
[6a] Toggle training mode (QLO﻿RA/FULL)
[7] Merge LoRA → full student (optional)
[8] Evaluate student (reasoning + JSON)
[9] Export & quantize (HF full + AWQ 4-bit + try GGUF Q4/Q5/Q8)
[10] Summaries (dataset stats → MD + JSON)
[11] Quit
"""

def main():
    print(f"BASE: {BASE}\nDATA: {DATAD}\nOUT : {OUTD}\nPKG : {PKGDIR}\n")
    while True:
        print(MENU)
        choice = input("Select: ").strip().lower()
        if   choice == "1":   action_setup()
        elif choice == "2":   action_hf_login()
        elif choice == "3":   action_clean()
        elif choice == "4":   action_dryrun()
        elif choice == "5":   action_label()
        elif choice == "6":   action_train()
        elif choice == "6a":  action_toggle_mode()
        elif choice == "7":   action_merge()
        elif choice == "8":   action_eval()
        elif choice == "9":   action_export_quant()
        elif choice == "10":  action_summary()
        elif choice == "11" or choice.startswith("q"): break
        else: print("Unknown choice.")
        print("\n--- done ---\n")

if __name__ == "__main__":
    try:
        safe_imports()
    except Exception:
        print("Installing isolated packages …")
        ensure_pkgs(); safe_imports()
    main()
