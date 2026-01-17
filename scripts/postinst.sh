#!/bin/bash
# Post-installation script for Bitunix Charts .deb package

set -e

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database -q /usr/share/applications 2>/dev/null || true
fi

# Update icon cache
if command -v gtk-update-icon-cache &> /dev/null; then
    for size in 16 24 32 48 64 128 256 512; do
        icon_dir="/usr/share/icons/hicolor/${size}x${size}/apps"
        if [ -d "$icon_dir" ]; then
            gtk-update-icon-cache -f -t /usr/share/icons/hicolor 2>/dev/null || true
            break
        fi
    done
fi

# Update MIME database
if command -v update-mime-database &> /dev/null; then
    update-mime-database /usr/share/mime 2>/dev/null || true
fi

# Set executable permissions
INSTALL_DIR="/opt/Bitunix Charts"
if [ -d "$INSTALL_DIR" ]; then
    chmod +x "$INSTALL_DIR/bitunix-charts" 2>/dev/null || true
fi

echo "Bitunix Charts installed successfully!"
echo "You can launch it from your applications menu or run: bitunix-charts"

exit 0
