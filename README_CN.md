# stata-ai-fusion

Stata MCP Server + Skill: 通过 AI 执行 Stata 命令、检查数据并生成高质量 Stata 代码。

## 概述

stata-ai-fusion 通过模型上下文协议 (MCP) 将 Stata 与 AI 编程助手连接起来。它提供了运行 Stata 命令、检查数据集、提取结果等工具，所有操作均可在 AI 助手中完成。

## 功能

- 交互式运行 Stata 命令和 `.do` 文件
- 检查数据集（describe、summarize、codebook）
- 提取存储结果（`e()`、`r()`、`s()`）
- 导出和缓存图形
- 搜索命令日志
- 安装社区软件包

## 安装

```bash
pip install stata-ai-fusion
```

或者用于开发：

```bash
git clone https://github.com/your-org/stata-ai-fusion.git
cd stata-ai-fusion
pip install -e ".[dev]"
```

## 系统要求

- Python >= 3.11
- 已授权的 Stata 安装（SE、MP 或 BE 版本）

## 使用方法

启动 MCP 服务器：

```bash
stata-ai-fusion
```

然后配置您的 AI 助手以连接到服务器。详细设置说明请参阅文档。

## 贡献

请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解贡献指南。

## 许可证

MIT -- 详见 [LICENSE](LICENSE)。
