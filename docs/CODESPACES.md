# 在 GitHub Codespaces 中阅读和预览

Codespaces 提供云端开发容器和浏览器中的编辑器，可用于修改源码、运行 Node 测试以及预览本项目的浏览器兼容入口。上传本地代码只需 Git 推送，不要求先创建 Codespace。

## 创建

1. 先把本地项目推送到 GitHub。创建 Codespace 所选的分支不能是空分支，不必为了这个按钮另建一份 README。
2. 打开仓库，选中包含游戏代码的分支；本项目现有开发分支为 `codex/modern-front-hd`。
3. 点击 **Code → Codespaces → Create codespace**，等待浏览器编辑器打开。

这些步骤依据 [GitHub 创建 Codespace 文档](https://docs.github.com/en/codespaces/developing-in-a-codespace/creating-a-codespace-for-a-repository)，核对日期为 2026-10-25。这里没有代用户创建或启用云端资源。

## 预览游戏源码

在编辑器的 Terminal / 终端中确认已位于仓库根目录，并执行：

```sh
node --version
npm start
```

当前项目的启动脚本只使用 Node 内置模块和仓库资源，无需先执行 `npm install`。保留服务器终端运行，然后打开下方 **Ports / 端口**，找到 **8765**，点击 **Open in Browser / 在浏览器中打开**；没有自动出现时，点击 **Add port** 添加 8765。端口保持私有即可自己预览。[GitHub 端口转发说明](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace)

预览时 WebGL 游戏在访问页面的浏览器中运行；云端终端负责提供静态文件。这个入口不会运行 Windows `ModernFrontHD.exe`，也不能替代本机独立版的显卡与帧率验收。本文步骤按源码入口和官方文档整理，尚未在实际 Codespace 中验收。

## 测试与保存

另开一个终端，可以先执行较小的测试组：

```sh
node --test tests/commander-ai.test.cjs tests/hotpath-equivalence.test.cjs
```

完整模拟回归使用 `npm test`。桌面 EXE 回归另有 Windows、运行时与 Playwright 等条件，不能仅凭 CPU 测试通过就认为独立版也通过。

修改完成后，在 Source Control / 源代码管理面板查看差异并手动提交、推送。也可在终端执行 `git status`，确认自己改了哪些文件后再选择暂存和提交。只保存在 Codespace 文件系统中的内容还没有自动上传到仓库。

## 用量

个人账户有每月免费额度；额度以外的行为取决于付款方式与预算设置。计算资源在运行期间计量，存储在 Codespace 存在期间计量，所以关闭浏览器标签页不等于删除云端环境。[GitHub 用量与计费说明](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces)

使用完毕后管理自己的 Codespace 运行状态；不再需要的环境，应先确认修改已经提交并推送，再删除。
