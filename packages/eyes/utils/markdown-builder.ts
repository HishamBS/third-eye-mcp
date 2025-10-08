import { Heading } from '../constants';

export type MarkdownHeading =
  | Heading
  | `${'#' | '##' | '###' | '####' | '#####' | '######'} ${string}`;
export type MarkdownListSymbol = '-' | '*' | '+';
export type MarkdownAlignment = 'left' | 'center' | 'right';

export interface MarkdownTableOptions {
  align?: MarkdownAlignment[];
}

function splitLines(value: string): string[] {
  return value.split(/\r?\n/);
}

function alignmentToSeparator(alignment: MarkdownAlignment): string {
  switch (alignment) {
    case 'center':
      return ':---:';
    case 'right':
      return '---:';
    default:
      return ':---';
  }
}

export class MarkdownBuilder {
  private readonly lines: string[] = [];
  private orderedCounter: number | null = null;

  static create(): MarkdownBuilder {
    return new MarkdownBuilder();
  }

  heading(value: MarkdownHeading): this {
    this.resetOrderedCounter();
    this.lines.push(value);
    return this;
  }

  text(value: string): this {
    this.resetOrderedCounter();
    splitLines(value).forEach(line => this.lines.push(line));
    return this;
  }

  raw(value: string): this {
    this.resetOrderedCounter();
    splitLines(value).forEach(line => this.lines.push(line));
    return this;
  }

  blank(count = 1): this {
    this.resetOrderedCounter();
    for (let i = 0; i < count; i += 1) {
      this.lines.push('');
    }
    return this;
  }

  bullet(value: string, symbol: MarkdownListSymbol = '-'): this {
    this.resetOrderedCounter();
    const segments = splitLines(value);
    segments.forEach((segment, index) => {
      if (index === 0) {
        this.lines.push(`${symbol} ${segment}`);
      } else {
        this.lines.push(`  ${segment}`);
      }
    });
    return this;
  }

  bullets(values: Iterable<string>, symbol: MarkdownListSymbol = '-'): this {
    for (const value of values) {
      this.bullet(value, symbol);
    }
    return this;
  }

  checklist(label: string, checked = false): this {
    this.resetOrderedCounter();
    const mark = checked ? 'x' : ' ';
    this.lines.push(`- [${mark}] ${label}`);
    return this;
  }

  numbered(value: string, index?: number): this {
    if (typeof index === 'number') {
      this.orderedCounter = index;
    } else {
      this.orderedCounter = (this.orderedCounter ?? 0) + 1;
    }

    const marker = this.orderedCounter;
    const segments = splitLines(value);
    segments.forEach((segment, idx) => {
      if (idx === 0) {
        this.lines.push(`${marker}. ${segment}`);
      } else {
        this.lines.push(`   ${segment}`);
      }
    });

    return this;
  }

  blockquote(value: string): this {
    this.resetOrderedCounter();
    splitLines(value).forEach(line => {
      this.lines.push(`> ${line}`);
    });
    return this;
  }

  codeBlock(code: string, language = ''): this {
    this.resetOrderedCounter();
    const fence = language ? `\`\`\`${language}` : '```';
    this.lines.push(fence);
    splitLines(code).forEach(line => this.lines.push(line));
    this.lines.push('```');
    return this;
  }

  table(headers: string[], rows: string[][], options?: MarkdownTableOptions): this {
    this.resetOrderedCounter();
    if (headers.length === 0) {
      return this;
    }

    const alignment = options?.align ?? [];

    const normalizedHeader = headers.map(header => header ?? '');
    const normalizedRows = rows.map(row => {
      const copy = [...row];
      while (copy.length < normalizedHeader.length) {
        copy.push('');
      }
      if (copy.length > normalizedHeader.length) {
        copy.length = normalizedHeader.length;
      }
      return copy;
    });

    this.lines.push(`| ${normalizedHeader.join(' | ')} |`);

    const separator = normalizedHeader
      .map((_, index) => alignment[index] ?? 'left')
      .map(alignmentToSeparator);
    this.lines.push(`| ${separator.join(' | ')} |`);

    normalizedRows.forEach(row => {
      this.lines.push(`| ${row.map(cell => cell ?? '').join(' | ')} |`);
    });

    return this;
  }

  append(builder: MarkdownBuilder): this {
    this.resetOrderedCounter();
    splitLines(builder.build()).forEach(line => this.lines.push(line));
    return this;
  }

  build(): string {
    return this.lines.join('\n');
  }

  toString(): string {
    return this.build();
  }

  isEmpty(): boolean {
    return this.lines.length === 0 || this.lines.every(line => line.length === 0);
  }

  private resetOrderedCounter(): void {
    this.orderedCounter = null;
  }
}
