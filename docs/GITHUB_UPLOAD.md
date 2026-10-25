# 首次上传较大 Git 历史

## 本次失败的证据

2026-10-25，首次推送 `codex/modern-front-hd` 的终端记录包含：

```text
error: RPC failed; curl 55 Send failure: Connection was reset
Writing objects: 100% ... 2.01 GiB ... done.
fatal: the remote end hung up unexpectedly
Everything up-to-date
```

最后一行不能抵消前面的失败。检查时 GitHub 仓库仍显示为空。GitHub 单次推送上限为 **2 GiB**，本次包已超限；连接中断也可能叠加网络问题，不能声称分批后网络一定稳定。[GitHub 官方说明](https://docs.github.com/en/get-started/using-git/troubleshooting-the-2-gb-push-limit)

本地截至 `1ecac8a` 共 26 次提交，历史可达对象未压缩总量约 2259.64 MiB；最大单文件约 18.97 MiB，未发现达到 100 MiB 的文件。上传问题本身只需拆分历史，无需删除 `.git`。随后维护者明确要求历史署名统一为 AYUAN，因此另行备份并迁移了作者元数据；原始哈希不再作为上传指令使用。

## 分批上传的原则

本仓库首次发布按提交逐段上传，每段成功后使用 `git ls-remote` 核对远端哈希。原始 26 次提交按 6 段估算的新增未压缩对象分别约 355.8、426.5、410.7、401.0、373.2、292.5 MiB；这不是网络压缩包的实测大小。

当前仓库已经执行作者元数据迁移，**不要再复制旧截图中的短哈希推送**。正常后续更新只需提交后执行 `git push`。

如将完整历史首次发布到另一个空仓库，先用 `git rev-list --first-parent --reverse HEAD` 查看当前历史，选择间隔较小的提交依次推送。命令格式如下，`COMMIT_SHA` 必须替换为实际哈希：

```cmd
cd /d "D:\现代战线HD"
git push origin COMMIT_SHA:refs/heads/codex/modern-front-hd
```

每批完成后验证远端；连接中断时先查询已成功的节点再续传。远端有独立提交时应先合并，不能用强制推送绕过分叉。本次发布保留了维护者在线创建的工作流提交，并将 Deno 模板改为项目实际使用的 Node.js 测试。

## 怎样确认真正上传成功

终端通常会显示新分支创建或提交区间更新，且没有 `fatal` / `error`。最后核对：

```cmd
git rev-parse codex/modern-front-hd
git ls-remote --heads origin refs/heads/codex/modern-front-hd
```

两处提交哈希一致，表示当前本地分支已经上传。刷新 GitHub 代码页，应看到 `README.md`、`src/`、`tests/` 等文件。若有其他分支，选择 `codex/modern-front-hd` 查看。

## 连接超时与代理配置

包体积超限与建立连接失败需要分别处理。若在出现对象枚举之前就报 `Failed to connect to github.com port 443`，应先检查连接通道，不能靠继续后面的批次解决。

本机排查发现 Windows 使用本地 HTTP 代理，而普通 CMD 没有代理环境变量，仓库 Git 也没有显式代理配置。已在本仓库的 Git 本地配置中为 `https://github.com/` 设置对应代理与 HTTP/1.1，并在清空临时代理环境变量后通过实际 Git 推送预检。直连有时也能成功，所以不把一次成功检查等同于长期网络稳定。

代理地址属于各机器配置，不应写死进公共源码。换机后检查自己的地址；如果不再使用该代理，可以删除本仓库的专用配置：

```sh
git config --local --unset http.https://github.com/.proxy
git config --local --unset http.https://github.com/.version
```

保留 HTTPS 证书验证。`http.postBuffer` 不是通用的网络故障修复方法；Git 官方说明提高它主要影响分块传输并可能增加内存使用。[Git 配置说明](https://git-scm.com/docs/git-config)

## 后续变更需要先提交

技术亮点和使用指南写入工作区后，只有执行提交才会进入上传历史。维护者可先查看差异，再按需要执行：

```cmd
git diff -- README.md
git add README.md docs/TECHNICAL_HIGHLIGHTS.md docs/CODESPACES.md docs/GITHUB_UPLOAD.md
git commit -m "docs: explain technical highlights and contributor workflows"
git push
```

Git 作者名称与 GitHub 登录账号是两项配置。本项目作者、提交者署名统一为 `AYUAN`，使用对应账号的 GitHub 隐私邮箱。历史署名迁移单独执行并保留本地原始历史备份；日常修改 `user.name` 不会自动更新旧提交。GitHub 账号链接仍显示实际登录名 `834392934-create`。推送操作由维护者执行或明确授权后执行。
