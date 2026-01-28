#!/usr/bin/env python3
"""
Generate GManager application icons
A simple password manager icon with lock/keyhole design
"""

from PIL import Image, ImageDraw
import os

def create_icon(size, output_path):
    """Create a single icon with given size"""
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Colors - professional blue gradient theme
    bg_color = (52, 115, 201)     # #3473C9 - Primary blue
    dark_color = (35, 77, 137)    # Darker blue for shadow
    light_color = (100, 160, 230) # Lighter blue for highlight
    white = (255, 255, 255)

    # Draw rounded rectangle (shield/lock body)
    padding = size // 10
    box_size = size - 2 * padding
    corner_radius = box_size // 5

    # Draw shadow
    shadow_padding = padding + size // 40
    draw.rounded_rectangle(
        [shadow_padding, shadow_padding,
         shadow_padding + box_size, shadow_padding + box_size],
        radius=corner_radius,
        fill=(30, 65, 120, 100)
    )

    # Draw main body
    draw.rounded_rectangle(
        [padding, padding, padding + box_size, padding + box_size],
        radius=corner_radius,
        fill=bg_color
    )

    # Draw lock shackle (arc)
    shackle_width = box_size // 2
    shackle_height = box_size // 2
    shackle_x = padding + box_size // 2 - shackle_width // 2
    shackle_y = padding - box_size // 10
    shackle_thickness = max(2, size // 25)

    # Shackle bounding box for arc
    arc_bbox = [
        shackle_x,
        shackle_y - shackle_height // 2,
        shackle_x + shackle_width,
        shackle_y + shackle_height // 2
    ]

    # Draw the shackle
    draw.arc(arc_bbox, start=0, end=180, fill=white, width=shackle_thickness)

    # Draw keyhole
    center_x = size // 2
    center_y = size // 2 + size // 20
    keyhole_radius = size // 12

    # Keyhole circle
    draw.ellipse(
        [center_x - keyhole_radius, center_y - keyhole_radius,
         center_x + keyhole_radius, center_y + keyhole_radius],
        fill=white
    )

    # Keyhole stem (rectangle below circle)
    stem_width = keyhole_radius
    stem_height = keyhole_radius * 1.5
    draw.rectangle(
        [center_x - stem_width // 2, center_y,
         center_x + stem_width // 2, center_y + stem_height],
        fill=white
    )

    # Save
    img.save(output_path, 'PNG')
    print(f"Created: {output_path} ({size}x{size})")


def create_ico_file(sizes, output_path):
    """Create ICO file with multiple sizes"""
    icons = []
    for size in sizes:
        # Create temporary image
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        bg_color = (52, 115, 201)
        dark_color = (35, 77, 137)
        white = (255, 255, 255)

        padding = size // 10
        box_size = size - 2 * padding
        corner_radius = box_size // 5

        # Shadow
        shadow_padding = padding + size // 40
        draw.rounded_rectangle(
            [shadow_padding, shadow_padding,
             shadow_padding + box_size, shadow_padding + box_size],
            radius=corner_radius,
            fill=(30, 65, 120, 100)
        )

        # Main body
        draw.rounded_rectangle(
            [padding, padding, padding + box_size, padding + box_size],
            radius=corner_radius,
            fill=bg_color
        )

        # Shackle
        shackle_width = box_size // 2
        shackle_height = box_size // 2
        shackle_x = padding + box_size // 2 - shackle_width // 2
        shackle_y = padding - box_size // 10
        shackle_thickness = max(2, size // 25)

        arc_bbox = [
            shackle_x,
            shackle_y - shackle_height // 2,
            shackle_x + shackle_width,
            shackle_y + shackle_height // 2
        ]
        draw.arc(arc_bbox, start=0, end=180, fill=white, width=shackle_thickness)

        # Keyhole
        center_x = size // 2
        center_y = size // 2 + size // 20
        keyhole_radius = size // 12

        draw.ellipse(
            [center_x - keyhole_radius, center_y - keyhole_radius,
             center_x + keyhole_radius, center_y + keyhole_radius],
            fill=white
        )

        stem_width = keyhole_radius
        stem_height = keyhole_radius * 1.5
        draw.rectangle(
            [center_x - stem_width // 2, center_y,
             center_x + stem_width // 2, center_y + stem_height],
            fill=white
        )

        icons.append(img)

    # Save as ICO
    icons[0].save(output_path, format='ICO', sizes=[(i.width, i.height) for i in icons])
    print(f"Created: {output_path} (ICO with sizes: {[i.width for i in icons]})")


def main():
    output_dir = '/home/eric/coding/gmanager-glm/apps/desktop/src-tauri/icons'
    os.makedirs(output_dir, exist_ok=True)

    print("Creating GManager icons...")

    # Create PNG icons
    create_icon(32, os.path.join(output_dir, '32x32.png'))
    create_icon(128, os.path.join(output_dir, '128x128.png'))
    create_icon(256, os.path.join(output_dir, '128x128@2x.png'))

    # Create ICO file (Windows)
    create_ico_file([16, 32, 48, 256], os.path.join(output_dir, 'icon.ico'))

    # Create ICNS file placeholder (macOS) - simplified
    # Full ICNS requires iconutil, create a PNG as placeholder
    create_icon(512, os.path.join(output_dir, 'icon.icns.png'))
    print("Note: icon.icns created as PNG placeholder. For macOS, use 'iconutil' on macOS.")

    print("\nAll icons created successfully!")


if __name__ == '__main__':
    main()
