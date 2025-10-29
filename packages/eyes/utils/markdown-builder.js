function splitLines(value) {
    return value.split(/\r?\n/);
}
function alignmentToSeparator(alignment) {
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
    lines = [];
    orderedCounter = null;
    static create() {
        return new MarkdownBuilder();
    }
    heading(value) {
        this.resetOrderedCounter();
        this.lines.push(value);
        return this;
    }
    text(value) {
        this.resetOrderedCounter();
        splitLines(value).forEach(line => this.lines.push(line));
        return this;
    }
    raw(value) {
        this.resetOrderedCounter();
        splitLines(value).forEach(line => this.lines.push(line));
        return this;
    }
    blank(count = 1) {
        this.resetOrderedCounter();
        for (let i = 0; i < count; i += 1) {
            this.lines.push('');
        }
        return this;
    }
    bullet(value, symbol = '-') {
        this.resetOrderedCounter();
        const segments = splitLines(value);
        segments.forEach((segment, index) => {
            if (index === 0) {
                this.lines.push(`${symbol} ${segment}`);
            }
            else {
                this.lines.push(`  ${segment}`);
            }
        });
        return this;
    }
    bullets(values, symbol = '-') {
        for (const value of values) {
            this.bullet(value, symbol);
        }
        return this;
    }
    checklist(label, checked = false) {
        this.resetOrderedCounter();
        const mark = checked ? 'x' : ' ';
        this.lines.push(`- [${mark}] ${label}`);
        return this;
    }
    numbered(value, index) {
        if (typeof index === 'number') {
            this.orderedCounter = index;
        }
        else {
            this.orderedCounter = (this.orderedCounter ?? 0) + 1;
        }
        const marker = this.orderedCounter;
        const segments = splitLines(value);
        segments.forEach((segment, idx) => {
            if (idx === 0) {
                this.lines.push(`${marker}. ${segment}`);
            }
            else {
                this.lines.push(`   ${segment}`);
            }
        });
        return this;
    }
    blockquote(value) {
        this.resetOrderedCounter();
        splitLines(value).forEach(line => {
            this.lines.push(`> ${line}`);
        });
        return this;
    }
    codeBlock(code, language = '') {
        this.resetOrderedCounter();
        const fence = language ? `\`\`\`${language}` : '```';
        this.lines.push(fence);
        splitLines(code).forEach(line => this.lines.push(line));
        this.lines.push('```');
        return this;
    }
    table(headers, rows, options) {
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
    append(builder) {
        this.resetOrderedCounter();
        splitLines(builder.build()).forEach(line => this.lines.push(line));
        return this;
    }
    build() {
        return this.lines.join('\n');
    }
    toString() {
        return this.build();
    }
    isEmpty() {
        return this.lines.length === 0 || this.lines.every(line => line.length === 0);
    }
    resetOrderedCounter() {
        this.orderedCounter = null;
    }
}
//# sourceMappingURL=markdown-builder.js.map