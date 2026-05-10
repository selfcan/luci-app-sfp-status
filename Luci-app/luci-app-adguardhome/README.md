# luci-app-adguardhome

复杂的 AdGuardHome OpenWrt LuCI 界面。

## 中文说明

### 功能

- 可以管理网页端口。
- 可以在 LuCI 中下载和更新核心版本，支持自定义下载链接。
  - 如果是 tar.gz 文件，需要与官方发布包保持一致的目录结构。
  - 也可以直接提供主程序二进制。
- 支持 UPX 压缩核心。
  - 依赖 xz。
  - 脚本会自动下载；如果 opkg 源无法连接，请在编译时加入对应依赖包。
- 支持 DNS 重定向。
  - 作为 dnsmasq 的上游服务器。此模式下 AGH 中统计到的客户端 IP 会变成 127.0.0.1，无法正确统计真实客户端及其对应设置，但 ssr-plus 正常。
  - 将 53 端口重定向到 AdGuardHome。若客户端走 IPv6，则需要开启 IPv6 NAT redirect，否则过滤无效；在不以 dnsmasq 为上游的情况下，ssr-plus 会失效。
  - 使用 53 端口替换 dnsmasq。此模式需要把 AGH 的 dnsip 设置为 0.0.0.0；AGH 和 dnsmasq 的端口会互换；在不以 dnsmasq 为上游时，ssr-plus 会失效。
- 支持自定义执行文件路径。
  - 支持放在 tmp。
  - 重启后如果核心不存在，会自动重新下载。
- 支持自定义配置文件路径。
- 支持自定义工作目录。
- 支持自定义运行日志路径。
- 支持 gfwlist 的删除、添加与上游 DNS 自定义。
  - 相关项目推荐：[luci-app-autoipsetadder](https://github.com/rufengsuixing/luci-app-autoipsetadder)
- 支持修改网页登录密码。
- 支持正序和倒序查看、删除、备份运行日志，并每 3 秒自动刷新显示，同时按本地浏览器时区转换时间。
- 支持手动修改配置文件。
  - 提供 YAML 编辑器。
  - 支持模板快速配置。
- 支持系统升级时保留勾选文件。
- 支持开机启动后等待网络就绪再重启 AdGuardHome。
  - 超时时间 3 分钟，主要用于减少过滤器更新失败。
- 支持关机时备份工作目录中勾选的文件。
  - 注意：在 ipk 更新时也会触发备份。
- 支持计划任务，默认时间和参数可以自行修改。
  - 自动更新核心，默认每天 3:30，建议谨慎使用。
  - 自动截短查询日志，默认每小时执行一次，限制到 2000 行。
  - 自动截短运行日志，默认每天 3:30 执行一次，限制到 2000 行。
  - 自动更新 IPv6 hosts 并重启 AGH，默认每小时执行一次，无更新则不重启。
  - 自动更新 gfwlist 并重启 AGH，默认每天 3:30 执行一次，无更新则不重启。

### 已知问题

- 数据库不支持放在不支持 mmap 的文件系统上，比如 jffs2、data-stk-oo。请修改工作目录。
  - 如果程序检测到 jffs2，会自动把数据库软链接到 /tmp，因此重启后会丢失 DNS 数据库。
- AdGuardHome 目前不支持 ipset。
  - 在使用 ipset 时，它不能替代 dnsmasq，只能作为 dnsmasq 的上游。
  - 如果你需要这个能力，请关注并投票：[AdGuardHome issue #1191](https://github.com/AdguardTeam/AdGuardHome/issues/1191)
- 如果日志里出现大量来自 127.0.0.1 的 localhost 查询，常见原因是 ddns 插件。
  - 如果不用 ddns，请删除或注释 /etc/hotplug.d/iface/95-ddns。
  - 如果还有其他来自本机的异常查询，可参考：[kmod-plog-port](https://github.com/rufengsuixing/kmod-plog-port)
- 如果出现需要多次提交才有反应的现象，请及时提交 issue。

### 使用方法

- 下载 release 后使用 opkg 安装。
- 或者在编译 OpenWrt 时把本项目 clone 到 package 路径并选中编译。

### GitHub Actions 编译

- 仓库新增 workflow：[.github/workflows/build-luci-app-adguardhome.yml](.github/workflows/build-luci-app-adguardhome.yml)
- 支持 workflow_dispatch 自定义 SDK 发行版、版本、target 和 subtarget，并可选择是否直接发布 Release。
- 推送 adguardhome-v* tag 时会自动构建 luci-app-adguardhome 的 ipk，并可用于 GitHub Release 发布。
- 产物会包含 luci-app-adguardhome*.ipk 与对应 Packages* 索引。
- 默认目标为 OpenWrt 24.10.0 mediatek/filogic。

### 升级到 modern 版后的兼容与验证

- 新版安装和首次启动时会主动清理旧的 Lua 前端残留。
  - controller/AdGuardHome.lua
  - model/cbi/AdGuardHome/*
  - view/AdGuardHome/*
- 如果从旧版升级后浏览器仍显示旧页面，请强制刷新浏览器缓存；包安装阶段也会同步清理 LuCI index 和 module cache。
- 如需手动清理设备缓存，可执行：

```sh
rm -rf /tmp/luci-modulecache /var/luci-modulecache
rm -f /tmp/luci-indexcache /tmp/luci-indexcache.* /var/luci-indexcache.*
/etc/init.d/rpcd reload
```

- 升级完成后，菜单应显示 4 个 modern 页面。
  - Overview
  - Settings
  - YAML Editor
  - Runtime Log
- 运行时可用以下命令快速验证：

```sh
ubus list luci.adguardhome
ubus call luci.adguardhome getStatus '{}'
```

- 页面侧建议至少检查以下项目：
  - Settings 页保存并应用后，服务状态会刷新。
  - YAML Editor 可以载入模板、校验并应用。
  - Runtime Log 可以在运行日志和更新日志之间切换轮询。
  - Overview 页可以跳转到设置页、YAML 页和日志页。

### 关于压缩

我测试了在 jffs2 这类压缩文件系统上对核心执行文件进行 UPX 压缩后的空间和内存变化，使用的是“最好压缩”模式。

文件大小：

- 源文件：14112 KB
- 使用 UPX 压缩后：5309 KB

实际占用：

- 未压缩：6260 KB
- 压缩后：5324 KB
- 差值：936 KB

VmRSS 运存占用：

- 未压缩：14380 KB
- 压缩后：18496 KB
- 差值：-4116 KB

结论：

- 对压缩文件系统来说，开启压缩有收益，但不算特别大。
- 对非压缩文件系统来说，性价比更高。
- 本质上是用运行内存换 ROM 空间，是否开启取决于你的设备约束。

### 关于 ssr 配合

1. gfw 代理方案一：使用“作为 dnsmasq 的上游服务器”模式。
2. gfw 代理方案二：手动把 AGH 上游 DNS 设置成自己，即 127.0.0.1:你的监听端口，再使用“使用 53 端口替换 dnsmasq”模式；因为端口互换后就变成 dnsmasq 为上游。
3. 国外 IP 代理方案：任意重定向方式，AGH 中加入 gfw 列表，并开启计划任务定时更新 gfw 即可。
4. gfw 代理方案四：使用“重定向 53 端口到 AdGuardHome”模式，并把 AGH 上游 DNS 设置为 127.0.0.1:53。

### 项目状态

项目已经基本稳定，有 bug 欢迎主动反馈。

## English

Complex OpenWrt LuCI frontend for AdGuardHome.

### Features

- Manage the browser management port.
- Download and update the AdGuardHome core directly from LuCI.
- Compress the core with UPX.
- Support DNS redirection.
  - As the upstream of dnsmasq.
  - Redirect port 53 to AdGuardHome.
  - Replace dnsmasq with port 53.
- Change the binary path.
- Change the config path.
- Change the workdir.
  - The workdir may be placed in tmp and the core can be re-downloaded after reboot.
- Change the runtime log path.
- Use a specific upstream DNS server for gfwlist processing.
- Modify the browser login password.
- View, delete and back up runtime logs in normal or reverse order with 3-second refresh.
- Modify the config manually with a YAML editor.
- Use a template for fast config when no config file exists.
- Keep selected files across sysupgrade.
- Wait for network access after boot before restarting AGH.
- Back up selected workdir files on shutdown.

### Known issues

- The database does not work on filesystems without mmap support, such as jffs2 and data-stk-oo.
  - If jffs2 is detected, the package may soft-link databases to /tmp, which means DNS database data is lost after reboot.
- AdGuardHome does not support ipset yet.
  - In ipset scenarios it can only be the upstream of dnsmasq, not a full replacement.
  - See and vote here: [AdGuardHome issue #1191](https://github.com/AdguardTeam/AdGuardHome/issues/1191)
- If you see many localhost queries from 127.0.0.1, the ddns plugin is a common cause.
  - If you do not use ddns, remove or comment /etc/hotplug.d/iface/95-ddns.

### Usage

- Download a release and install it with opkg.
- Or clone the project into the package path when building OpenWrt and enable it in menuconfig.

### Screenshots

![Screenshot_2019-12-23 newifi-d1 - 基础设置 - LuCI](.images/71361626-81d60900-25ce-11ea-91d5-ac4e35d5c41e.png)
![图片](.images/71361650-90242500-25ce-11ea-9727-9306a3da1357.png)
![Screenshot_2019-12-23 newifi-d1 - 日志 - LuCI(1)](.images/71361700-b944b580-25ce-11ea-8562-f68c28952b2b.png)
![Screenshot_2019-12-23 newifi-d1 - 手动设置 - LuCI](.images/71361704-bb0e7900-25ce-11ea-8042-6dd396607030.png)
