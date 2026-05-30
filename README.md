<div align="center">

# ScholarFlow

**面向个人学术主页、科研成果展示与学术影响力组织的展示工作流原型**  
*Scholar profile and academic portfolio workflow for publications, projects, software, and research identity presentation.*

![Type](https://img.shields.io/badge/type-Academic%20Portfolio-blue?style=flat-square)
![Domain](https://img.shields.io/badge/domain-scholar%20profile%20%2F%20portfolio-green?style=flat-square)
![Status](https://img.shields.io/badge/status-prototype-orange?style=flat-square)
![Architecture](https://img.shields.io/badge/architecture-profile%20workflow-purple?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)

Part of **ResearchFlow Lab** — a local-first research productivity ecosystem for literature, manuscripts, data, and scientific visualization.

</div>

---

## 01. Overview

**ScholarFlow** is a prototype for organizing a personal academic profile and research portfolio. It is intended to connect publications, software projects, research directions, visual assets, and academic identity into a coherent presentation workflow.

**ScholarFlow** 是一个个人学术展示工作流原型，用于组织论文成果、研究方向、科研软件、项目页面、个人简介和可视化展示素材。它服务于个人主页、简历、学术展示页和科研软件作品集。

---

## 02. Why this project exists

A researcher's work is often scattered across papers, GitHub repositories, CV files, institutional pages, Google Scholar, ORCID, and slides. ScholarFlow aims to provide a structured way to present academic identity and research outputs consistently.

核心目标：

- Organize publications, projects, software, and research topics.
- Build a consistent academic portfolio style.
- Connect research software repositories with scholarly outputs.
- Support personal homepage and CV-oriented presentation workflows.
- Serve as the profile/presentation layer of ResearchFlow Lab.

---

## 03. Planned features

| Module | What it does | 中文说明 |
|---|---|---|
| Publication Profile | Organizes papers, preprints, manuscripts, and selected works | 管理论文、预印本、手稿和代表性成果 |
| Project Portfolio | Displays research software and technical projects | 展示科研软件和技术项目 |
| Research Directions | Groups outputs by scientific topic or research area | 按研究方向组织成果 |
| Academic Identity | Stores biography, affiliations, links, and profile metadata | 管理个人简介、单位、链接和学术身份信息 |
| Visual Showcase | Presents figures, screenshots, demos, and graphical abstracts | 展示图件、截图、演示和图形摘要 |
| Export Layer | Generates content for homepage, CV, or README reuse | 输出可用于主页、简历和 README 的内容 |

---

## 04. Product philosophy

ScholarFlow follows four design principles:

1. **Academic clarity** — achievements should be grouped by research meaning, not only chronology.
2. **Portfolio consistency** — papers, software, and figures should share one visual identity.
3. **Reusable content** — profile text should be reusable across homepages, CVs, and repository READMEs.
4. **Research-first presentation** — visual design should support scientific credibility rather than decoration.

---

## 05. Architecture direction

```text
ScholarFlow
├── Profile Data
│   ├── biography
│   ├── affiliations
│   ├── research interests
│   └── external links
├── Output Data
│   ├── publications
│   ├── manuscripts
│   ├── software projects
│   └── awards / activities
├── Presentation Layer
│   ├── homepage sections
│   ├── project cards
│   ├── publication lists
│   └── visual showcase
└── Export Layer
    ├── homepage content
    ├── CV fragments
    ├── README snippets
    └── portfolio summaries
```

---

## 06. Quick start

```bash
git clone https://github.com/groele/ScholarFlow.git
cd ScholarFlow
```

Implementation details should be updated as the project evolves.

---

## 07. Recommended workflow

```text
Collect publications → Group by research direction
                     → Link software projects
                     → Add selected figures and demos
                     → Export profile content
                     → Publish through homepage / GitHub profile / CV
```

---

## 08. Roadmap

- [ ] Define academic profile data schema
- [ ] Add publication-list template
- [ ] Add software-project portfolio cards
- [ ] Add CV and homepage export formats
- [ ] Add ResearchFlow project import
- [ ] Add ORCID / Google Scholar link section
- [ ] Add visual style consistent with ResearchFlow Lab

---

## 09. Privacy and data ownership

ScholarFlow should store profile and portfolio data locally or in user-controlled repositories. Unpublished manuscripts, private figures, and internal project notes should not be published unless explicitly selected.

---

## 10. Related projects

- **Scholar-page** — personal academic homepage prototype
- **ResearchFlow Companion** — research workflow operating system
- **Scientific Color Lab** — scientific color and visualization workspace
- **PaperPilot Pro** — academic search and publisher-page enhancement
- **ManuGuide** — manuscript formatting and style checker

---

## 11. License

MIT License.

Developed by **Shikun Hou / groele**.
