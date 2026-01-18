#!/bin/bash
# Post-installation script for Bitunix Charts .deb package

set -e

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database -q /usr/share/applications 2>/dev/null || true
fi

# Update icon cache
if command -v gtk-update-icon-cache &> /dev/null; then
    for icon_size in 16 24 32 48 64 128 256 512; do
        icon_dir="/usr/share/icons/hicolor/${icon_size}x${icon_size}/apps"
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
    chmod 4755 "$INSTALL_DIR/chrome-sandbox" 2>/dev/null || true
fi

# Fix Desktop File Execution Flags (Sandbox fix for Ubuntu 24.04)
DESKTOP_FILE="/usr/share/applications/bitunix-charts.desktop"
if [ -f "$DESKTOP_FILE" ]; then
    # Replace the Exec line to include --no-sandbox
    # Match various forms of Exec line just in case
    sed -i 's|Exec="/opt/Bitunix Charts/bitunix-charts" %U|Exec="/opt/Bitunix Charts/bitunix-charts" --no-sandbox --disable-gpu %U|g' "$DESKTOP_FILE"
    # Fallback if quotes are different
    sed -i 's|Exec=/opt/Bitunix\\ Charts/bitunix-charts %U|Exec="/opt/Bitunix Charts/bitunix-charts" --no-sandbox --disable-gpu %U|g' "$DESKTOP_FILE"
fi

echo "Bitunix Charts installed successfully!"
echo "You can launch it from your applications menu or run: bitunix-charts"

exit 0
