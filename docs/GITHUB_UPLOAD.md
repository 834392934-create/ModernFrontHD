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

本地截至 `1ecac8a` 共 26 次提交，历史可达对象未压缩总量约 2259.64 MiB；最大单文件约 18.97 MiB，未发现达到 100 MiB 的文件。这次主要需要拆分历史上传，不需要删除 `.git` 或重写提交。

## 在 CMD 中逐批上传

适用条件：远端为空，或者已经成功上传下列某个较早节点；远端没有另外创建的 README 提交或其他分叉。每行单独执行，上一行成功后再继续。以下均为普通前进推送，没有强制覆盖选项。

```cmd
cd /d "D:\现代战线HD"
git push origin 2cd29a73afe08dacb3b1c5ff99a1d53d23ffae33:refs/heads/codex/modern-front-hd
git push origin a069a5669889d228ece36c3715f11ae1560ca4d7:refs/heads/codex/modern-front-hd
git push origin 57fbf81f91f7fc0052d583351f09e57bc79b1a46:refs/heads/codex/modern-front-hd
git push origin 714e3357fafe4e6fba5eda43cf13d329e7e76f25:refs/heads/codex/modern-front-hd
git push origin 9fa9c67632b31117d36400ed484992591ae33062:refs/heads/codex/modern-front-hd
git push -u origin codex/modern-front-hd
```

| 批次 | 包含到第几次提交 | 相比前一批新增的未压缩对象 |
|---|---:|---:|
| 1 | 5 | 355.8 MiB |
| 2 | 9 | 426.5 MiB |
| 3 | 14 | 410.7 MiB |
| 4 | 20 | 401.0 MiB |
| 5 | 24 | 373.2 MiB |
| 6 | 26，即 `1ecac8a` | 292.5 MiB |

这是根据 `git rev-list --objects` 和 `git cat-file --batch-check` 计算的对象体积，不是实际网络压缩包测量；差分压缩、协议开销和之后的新提交会改变传输量。当前各批与 2 GiB 限制留有较大余量。

第一批成功后页面会先显示较旧版本，全部完成才到当前版本。若某一批中断，保留终端输出并检查远端实际停在哪个提交，再继续该批；已成功上传的较早批次无需反复重传。若提示 `non-fast-forward`，应先检查远端历史，不要添加 `--force`。

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

Git 作者名称与 GitHub 登录账号是两项配置。本项目本轮新提交的作者设为 `ayuan`，使用对应账号的 GitHub 隐私邮箱；该设置影响之后的新提交，不会自动改写既有历史。推送操作由维护者执行或明确授权后执行。
