# Copyright (C) 2018-2019 Lienol
#
# This is free software, licensed under the Apache License, Version 2.0 .
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-adguardhome
PKG_VERSION:=1.8
PKG_RELEASE:=20

LUCI_DEPENDS:=+luci-base +rpcd +!wget&&!curl:wget

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-adguardhome
	SECTION:=luci
	CATEGORY:=LuCI
	SUBMENU:=3. Applications
	TITLE:=LuCI app for adguardhome
	PKG_MAINTAINER:=<https://github.com/AdguardTeam/AdGuardHome>
	PKGARCH:=all
	DEPENDS:=$(LUCI_DEPENDS)
endef

define Package/luci-app-adguardhome/description
	LuCI support for adguardhome
endef

define Build/Compile
endef

define Package/luci-app-adguardhome/conffiles
/usr/share/AdGuardHome/links.txt
/etc/config/AdGuardHome
/etc/config/adGuardConfig/AdGuardHome.yaml
endef

define Package/luci-app-adguardhome/install
	$(INSTALL_DIR) $(1)/www
	cp -pR ./htdocs/* $(1)/www/
	$(INSTALL_DIR) $(1)/
	cp -pR ./root/* $(1)/
	chmod 0755 \
		$(1)/etc/init.d/AdGuardHome \
		$(1)/etc/uci-defaults/40_luci-AdGuardHome \
		$(1)/usr/libexec/rpcd/luci.adguardhome \
		$(1)/usr/share/AdGuardHome/addhost.sh \
		$(1)/usr/share/AdGuardHome/firewall.start \
		$(1)/usr/share/AdGuardHome/getsyslog.sh \
		$(1)/usr/share/AdGuardHome/gfw2adg.sh \
		$(1)/usr/share/AdGuardHome/tailto.sh \
		$(1)/usr/share/AdGuardHome/update_core.sh \
		$(1)/usr/share/AdGuardHome/waitnet.sh \
		$(1)/usr/share/AdGuardHome/watchconfig.sh
endef

define Package/luci-app-adguardhome/postinst
#!/bin/sh
	cleanup_legacy_frontend() {
		for legacy_file in \
			/usr/lib/lua/luci/controller/AdGuardHome.lua \
			/usr/lib/lua/luci/model/cbi/AdGuardHome/base.lua \
			/usr/lib/lua/luci/model/cbi/AdGuardHome/log.lua \
			/usr/lib/lua/luci/model/cbi/AdGuardHome/manual.lua \
			/usr/lib/lua/luci/view/AdGuardHome/AdGuardHome_check.htm \
			/usr/lib/lua/luci/view/AdGuardHome/AdGuardHome_chpass.htm \
			/usr/lib/lua/luci/view/AdGuardHome/AdGuardHome_status.htm \
			/usr/lib/lua/luci/view/AdGuardHome/log.htm \
			/usr/lib/lua/luci/view/AdGuardHome/yamleditor.htm
		do
			rm -f "$${legacy_file}"
		done
		rmdir /usr/lib/lua/luci/model/cbi/AdGuardHome 2>/dev/null
		rmdir /usr/lib/lua/luci/view/AdGuardHome 2>/dev/null
	}
	[ -n "$${IPKG_INSTROOT}" ] && exit 0
	cleanup_legacy_frontend
	/etc/init.d/AdGuardHome enable >/dev/null 2>&1
	enable=$$(uci -q get AdGuardHome.AdGuardHome.enabled 2>/dev/null)
	if [ "$$enable" = "1" ]; then
		/etc/init.d/AdGuardHome reload >/dev/null 2>&1
	fi
	rm -rf /tmp/luci-modulecache/ /var/luci-modulecache/
	rm -f /tmp/luci-indexcache /tmp/luci-indexcache.* /var/luci-indexcache.* 2>/dev/null
	[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd reload >/dev/null 2>&1
exit 0
endef

define Package/luci-app-adguardhome/prerm
#!/bin/sh
if [ -z "$${IPKG_INSTROOT}" ]; then
     /etc/init.d/AdGuardHome disable
     /etc/init.d/AdGuardHome stop
uci -q batch <<-EOF >/dev/null 2>&1
	delete ucitrack.@AdGuardHome[-1]
	commit ucitrack
EOF
fi
exit 0
endef

$(eval $(call BuildPackage,luci-app-adguardhome))
