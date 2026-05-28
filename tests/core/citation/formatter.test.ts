import { describe, it, expect } from 'vitest';
import { formatCitation, formatCitationsBatch, type CitationData } from '../../../src/core/citation/formatter';

// 基础引用数据，用于大多数测试
const baseCitation: CitationData = {
  title: 'High-Temperature Superconductivity in Hydrides',
  authors: 'Smith, John A.; Doe, Jane B.',
  year: '2024',
  journal: 'Nature Physics',
  volume: '20',
  number: '3',
  pages: '123-130',
  doi: '10.1038/s41567-024-0001',
};

describe('formatCitation - APA 7 格式化', () => {
  // 测试：两位作者应使用逗号和&连接
  it('两位作者应使用逗号和 & 连接', () => {
    const result = formatCitation(baseCitation, 'apa7');
    expect(result).toContain('Smith, J.');
    expect(result).toContain('Doe, J.');
  });

  // 测试：应包含年份和标题
  it('应包含年份和标题', () => {
    const result = formatCitation(baseCitation, 'apa7');
    expect(result).toContain('(2024)');
    expect(result).toContain('High-Temperature Superconductivity in Hydrides');
  });

  // 测试：应包含斜体期刊名、卷号和页码
  it('应包含斜体期刊名、卷号和页码', () => {
    const result = formatCitation(baseCitation, 'apa7');
    expect(result).toContain('Nature Physics');
    expect(result).toContain('20');
    expect(result).toContain('123-130');
  });

  // 测试：应包含DOI链接
  it('应包含DOI链接', () => {
    const result = formatCitation(baseCitation, 'apa7');
    expect(result).toContain('https://doi.org/10.1038/s41567-024-0001');
  });

  // 测试：缺少年份时应显示n.d.
  it('缺少年份时应显示 n.d.', () => {
    const { year, ...rest } = baseCitation;
    const result = formatCitation({ ...rest, year: '' }, 'apa7');
    expect(result).toContain('n.d.');
  });

  // 测试：无作者时应显示 Unknown Author
  it('无作者时应显示 Unknown Author', () => {
    const result = formatCitation({ ...baseCitation, authors: '' }, 'apa7');
    expect(result).toContain('Unknown Author');
  });

  // 测试：超过20个作者时使用省略号格式
  it('超过20个作者时应使用省略号格式', () => {
    const manyAuthors = Array.from({ length: 25 }, (_, i) => `Last${i}, First${i}`).join('; ');
    const result = formatCitation({ ...baseCitation, authors: manyAuthors }, 'apa7');
    expect(result).toContain('...');
    expect(result).toContain(`Last24, F.`);
  });
});

describe('formatCitation - MLA 9 格式化', () => {
  // 测试：两位作者应使用and连接
  it('两位作者应使用 and 连接', () => {
    const result = formatCitation(baseCitation, 'mla9');
    expect(result).toContain('Smith, John A., and Doe, Jane B.');
  });

  // 测试：标题应用引号包裹
  it('标题应用引号包裹', () => {
    const result = formatCitation(baseCitation, 'mla9');
    expect(result).toContain('"High-Temperature Superconductivity in Hydrides."');
  });

  // 测试：超过两位作者应显示et al.
  it('超过两位作者应显示 et al.', () => {
    const data = { ...baseCitation, authors: 'Smith, John; Doe, Jane; Brown, Bob' };
    const result = formatCitation(data, 'mla9');
    expect(result).toContain('et al.');
  });
});

describe('formatCitation - Chicago 格式化', () => {
  // 测试：两位作者应使用and连接
  it('两位作者应使用 and 连接', () => {
    const result = formatCitation(baseCitation, 'chicago');
    expect(result).toContain('Smith, John A. and Doe, Jane B.');
  });

  // 测试：三位作者应全部列出并用逗号和and连接
  it('三位作者应全部列出', () => {
    const data = { ...baseCitation, authors: 'Smith, John; Doe, Jane; Brown, Bob' };
    const result = formatCitation(data, 'chicago');
    expect(result).toContain('Smith, John, Doe, Jane, and Brown, Bob');
  });

  // 测试：超过三位作者应使用et al.
  it('超过三位作者应使用 et al.', () => {
    const data = { ...baseCitation, authors: 'A, A; B, B; C, C; D, D' };
    const result = formatCitation(data, 'chicago');
    expect(result).toContain('et al.');
  });

  // 测试：应包含年份在括号中
  it('应包含年份在括号中', () => {
    const result = formatCitation(baseCitation, 'chicago');
    expect(result).toContain('(2024)');
  });
});

describe('formatCitation - GB/T 7714 格式化', () => {
  // 测试：作者不超过3位时全部列出
  it('作者不超过3位时应全部列出', () => {
    const result = formatCitation(baseCitation, 'gb7714');
    expect(result).toContain('Smith, John A., Doe, Jane B.');
  });

  // 测试：超过3位作者时使用"等"
  it('超过3位作者时应使用"等"', () => {
    const data = { ...baseCitation, authors: 'A, A; B, B; C, C; D, D' };
    const result = formatCitation(data, 'gb7714');
    expect(result).toContain('等');
  });

  // 测试：标题后应有[J]标记
  it('标题后应有 [J] 标记', () => {
    const result = formatCitation(baseCitation, 'gb7714');
    expect(result).toContain('[J]');
  });

  // 测试：无作者时应显示"佚名"
  it('无作者时应显示"佚名"', () => {
    const result = formatCitation({ ...baseCitation, authors: '' }, 'gb7714');
    expect(result).toContain('佚名');
  });
});

describe('formatCitation - BibTeX 内联格式化', () => {
  // 测试：应生成@article格式
  it('应生成 @article 格式', () => {
    const result = formatCitation(baseCitation, 'bibtex');
    expect(result).toMatch(/^@article\{/);
  });

  // 测试：引用键应包含第一作者姓氏和年份
  it('引用键应包含第一作者姓氏和年份', () => {
    const result = formatCitation(baseCitation, 'bibtex');
    expect(result).toContain('smith2024');
  });

  // 测试：应包含title、author、year、journal字段
  it('应包含 title、author、year、journal 字段', () => {
    const result = formatCitation(baseCitation, 'bibtex');
    expect(result).toContain('title = {High-Temperature Superconductivity in Hydrides}');
    expect(result).toContain('author = {Smith, John A.; Doe, Jane B.}');
    expect(result).toContain('year = {2024}');
    expect(result).toContain('journal = {Nature Physics}');
  });

  // 测试：无作者和年份时应使用默认键
  it('无作者和年份时应使用默认键', () => {
    const result = formatCitation({ ...baseCitation, authors: '', year: '' }, 'bibtex');
    expect(result).toContain('unknownnd');
  });
});

describe('formatCitation - 边界情况', () => {
  // 测试：仅有URL无DOI时应显示URL
  it('仅有 URL 无 DOI 时应显示 URL', () => {
    const data: CitationData = {
      ...baseCitation,
      doi: undefined,
      url: 'https://example.com/paper',
    };
    const result = formatCitation(data, 'apa7');
    expect(result).toContain('https://example.com/paper');
    expect(result).not.toContain('doi.org');
  });

  // 测试：所有可选字段缺失时仍应正常格式化
  it('所有可选字段缺失时仍应正常格式化', () => {
    const minimal: CitationData = {
      title: 'Minimal Paper',
      authors: 'Solo, Author',
      year: '2023',
      journal: '',
    };
    const result = formatCitation(minimal, 'apa7');
    expect(result).toContain('Solo, A.');
    expect(result).toContain('Minimal Paper');
    expect(result).toContain('(2023)');
  });

  // 测试：未知格式应默认使用APA 7
  it('未知格式应默认使用 APA 7', () => {
    const result = formatCitation(baseCitation, 'unknown' as any);
    // 未知格式回退到APA7，包含作者和年份
    expect(result).toContain('Smith, J.');
    expect(result).toContain('(2024)');
  });
});

describe('formatCitationsBatch - 批量格式化', () => {
  // 测试：应将多条引用用空行连接
  it('应将多条引用用空行连接', () => {
    const data: CitationData[] = [
      { title: 'Paper A', authors: 'Author, A', year: '2023', journal: 'J1' },
      { title: 'Paper B', authors: 'Author, B', year: '2024', journal: 'J2' },
    ];
    const result = formatCitationsBatch(data, 'apa7');
    expect(result).toContain('Paper A');
    expect(result).toContain('Paper B');
    expect(result).toContain('\n\n');
  });

  // 测试：空数组应返回空字符串
  it('空数组应返回空字符串', () => {
    const result = formatCitationsBatch([], 'apa7');
    expect(result).toBe('');
  });
});
