# This is free software, licensed under the Apache License, Version 2.0.

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-sfp-status
PKG_VERSION:=0.1.0
PKG_RELEASE:=17
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=GitHub Copilot

LUCI_TITLE:=LuCI SFP status monitor
LUCI_DESCRIPTION:=Overview and detailed DOM status for SFP modules
LUCI_DEPENDS:=+luci-base +ethtool
LUCI_PKGARCH:=all

define Package/$(PKG_NAME)/conffiles
/etc/config/sfp-status
endef

define Build/Prepare/$(PKG_NAME)
	chmod 0755 $(PKG_BUILD_DIR)/root/etc/uci-defaults/40_luci-sfp-status
	chmod 0755 $(PKG_BUILD_DIR)/root/usr/libexec/rpcd/luci.sfp-status
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh
if [ -z "$$IPKG_INSTROOT" ]; then
	uci -q delete sfp-status.settings.interface
	uci -q commit sfp-status
	rm -f /usr/share/luci/menu.d/luci-app-sfp-status.json
	rm -f /www/luci-static/resources/view/sfp-status/overview.js
	rm -f /www/luci-static/resources/sfp-status/common.js
	rm -rf /var/luci-modulecache/
	rm -f /var/luci-indexcache.*
	[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd reload
fi
exit 0
endef

include ../../luci.mk

# call BuildPackage - OpenWrt buildroot signature