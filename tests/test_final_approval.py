from third_eye.eyes.rinnegan import final_approval


def test_final_approval_blocks_incomplete(base_context):
    request = {
        "context": base_context,
        "payload": {
            "plan_approved": True,
            "scaffold_approved": True,
            "impl_approved": False,
            "tests_approved": True,
            "docs_approved": True,
            "text_validated": True,
            "consistent": True,
        },
    }
    result = final_approval(request)
    assert result["code"] == "E_PHASES_INCOMPLETE"


def test_final_approval_succeeds(base_context):
    request = {
        "context": base_context,
        "payload": {
            "plan_approved": True,
            "scaffold_approved": True,
            "impl_approved": True,
            "tests_approved": True,
            "docs_approved": True,
            "text_validated": True,
            "consistent": True,
        },
    }
    result = final_approval(request)
    assert result["code"] == "OK_ALL_APPROVED"
    assert result["data"]["approved"] is True
