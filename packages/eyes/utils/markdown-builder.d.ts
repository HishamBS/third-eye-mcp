export type Heading = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export type MarkdownHeading = Heading | `${'#' | '##' | '###' | '####' | '#####' | '######'} ${string}`;
export type MarkdownListSymbol = '-' | '*' | '+';
export type MarkdownAlignment = 'left' | 'center' | 'right';
export interface MarkdownTableOptions {
    align?: MarkdownAlignment[];
}
export declare class MarkdownBuilder {
    private readonly lines;
    private orderedCounter;
    static create(): MarkdownBuilder;
    heading(value: MarkdownHeading): this;
    text(value: string): this;
    raw(value: string): this;
    blank(count?: number): this;
    bullet(value: string, symbol?: MarkdownListSymbol): this;
    bullets(values: Iterable<string>, symbol?: MarkdownListSymbol): this;
    checklist(label: string, checked?: boolean): this;
    numbered(value: string, index?: number): this;
    blockquote(value: string): this;
    codeBlock(code: string, language?: string): this;
    table(headers: string[], rows: string[][], options?: MarkdownTableOptions): this;
    append(builder: MarkdownBuilder): this;
    build(): string;
    toString(): string;
    isEmpty(): boolean;
    private resetOrderedCounter;
}
//# sourceMappingURL=markdown-builder.d.ts.map