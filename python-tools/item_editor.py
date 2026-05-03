#!/usr/bin/env python3
"""
Minimal PAL DOS item editor

Usage:
  List inventory:   python3 item_editor.py --list SAVE.RPG
  Edit slot:        python3 item_editor.py --edit SLOT --item CODE --qty QTY SAVE.RPG
  List all items:   python3 item_editor.py --list-all-items

- Item names are shown using WORD.DAT (Big5, offset = code*10).
- To add an item, edit an empty slot.
- User selects items by code (see --list-all-items).
"""
from __future__ import annotations

import argparse
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

ITEM_TABLE_OFFSET = 0x06C0
ITEM_SLOT_SIZE = 6
MAX_SLOTS = 256  # Max number of inventory slots in save file (expanded)
DEFAULT_MAX_SLOTS = 256


def parse_int(value: str) -> int:
    return int(value, 0)


def format_hex(value: int, width: int = 4) -> str:
    return f"0x{value:0{width}X}"


@dataclass
class ItemSlot:
    index: int
    offset: int
    item_id: int
    quantity: int
    tail: bytes

    @property
    def is_empty(self) -> bool:
        return self.item_id == 0 and self.quantity == 0 and self.tail == b"\x00\x00"

    def describe(self) -> str:
        return (
            f"slot={self.index} offset={format_hex(self.offset)} "
            f"item={format_hex(self.item_id)} qty={self.quantity} "
            f"tail={self.tail.hex().upper()}"
        )


def load_save(path: Path) -> bytearray:
    return bytearray(path.read_bytes())


def read_slots(data: bytes, start: int, stride: int, max_slots: int) -> list[ItemSlot]:
    slots: list[ItemSlot] = []
    for index in range(max_slots):
        offset = start + index * stride
        chunk = data[offset : offset + stride]
        if len(chunk) < stride:
            break
        slots.append(
            ItemSlot(
                index=index,
                offset=offset,
                item_id=int.from_bytes(chunk[0:2], "little"),
                quantity=int.from_bytes(chunk[2:4], "little"),
                tail=bytes(chunk[4:6]),
            )
        )
    return slots


def write_slot(data: bytearray, slot: ItemSlot, item_id: int, quantity: int) -> None:
    data[slot.offset : slot.offset + 2] = item_id.to_bytes(2, "little", signed=False)
    data[slot.offset + 2 : slot.offset + 4] = quantity.to_bytes(
        2, "little", signed=False
    )
    data[slot.offset + 4 : slot.offset + 6] = slot.tail


def apply_quantity(slot: ItemSlot, qty: int | None, qty_delta: int | None) -> int:
    if qty is not None:
        return qty
    if qty_delta is not None:
        return slot.quantity + qty_delta
    if slot.is_empty:
        return 1
    return slot.quantity


def validate_u16(name: str, value: int) -> None:
    if not 0 <= value <= 0xFFFF:
        raise ValueError(f"{name} must be between 0 and 65535, got {value}")


def find_existing_item(slots: list[ItemSlot], item_id: int, skip_index: int | None) -> ItemSlot | None:
    for slot in slots:
        if slot.index == skip_index:
            continue
        if slot.item_id == item_id and not slot.is_empty:
            return slot
    return None


def first_empty_slot(slots: list[ItemSlot]) -> ItemSlot | None:
    for slot in slots:
        if slot.is_empty:
            return slot
    return None


def save_backup(path: Path) -> Path:
    backup_path = path.with_suffix(path.suffix + ".bak")
    shutil.copy2(path, backup_path)
    return backup_path


WORD_DAT = Path(__file__).resolve().parent.parent.parent / 'palgame' / 'WORD.DAT'

def get_item_name(item_id, word_path: Path | str | None = None):
    path = Path(word_path) if word_path is not None else WORD_DAT
    try:
        with path.open('rb') as f:
            f.seek(item_id * 10)
            raw = f.read(10)
            return raw.rstrip(b'\x00').decode('big5', errors='replace').strip()
    except Exception:
        return '(?)'

def list_all_items(word_path: Path | str | None = None, item_start=0, item_end=295):
    print(f"Listing item codes {item_start} to {item_end-1} (likely inventory items):")
    for code in range(item_start, item_end):
        name = get_item_name(code, word_path)
        print(f"itemcode={code:3d} (0x{code:02X}) name={name}")
    print("\nCodes 295 and above are likely skills or non-inventory entries.")

def read_slots(data, start, stride, max_slots):
    slots = []
    for i in range(max_slots):
        off = start + i * stride
        chunk = data[off:off+stride]
        if len(chunk) < stride:
            break
        item_id = int.from_bytes(chunk[0:2], 'little')
        qty = int.from_bytes(chunk[2:4], 'little')
        slots.append((i, off, item_id, qty))
    return slots

def print_slots(slots, show_empty=False):
    for idx, off, item_id, qty in slots:
        if not show_empty and item_id == 0 and qty == 0:
            continue
        name = get_item_name(item_id)
        print(f"slot={idx:2d} offset=0x{off:04X} item={item_id:3d} qty={qty:3d} name={name}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Edit the PAL DOS carried-item table in an RPG save."
    )
    parser.add_argument("save_file", help="Path to the save file, e.g. 4.RPG")
    parser.add_argument(
        "--list",
        action="store_true",
        help="List current item slots and exit",
    )
    parser.add_argument(
        "--list-all-items",
        action="store_true",
        help="List all possible item codes and names from WORD.DAT",
    )
    parser.add_argument(
        "--show-empty",
        action="store_true",
        help="Include empty slots when using --list",
    )
    target = parser.add_mutually_exclusive_group()
    target.add_argument(
        "--index",
        type=int,
        help="0-based item slot index to edit",
    )
    target.add_argument(
        "--append",
        action="store_true",
        help="Append to the first empty slot",
    )
    item_mode = parser.add_mutually_exclusive_group()
    item_mode.add_argument(
        "--item",
        type=parse_int,
        help="Set the item code directly (decimal or hex, e.g. 236 or 0xEC)",
    )
    item_mode.add_argument(
        "--item-delta",
        type=int,
        help="Add this signed delta to the current item code",
    )
    qty_mode = parser.add_mutually_exclusive_group()
    qty_mode.add_argument(
        "--qty",
        type=int,
        help="Set the quantity directly",
    )
    qty_mode.add_argument(
        "--qty-delta",
        type=int,
        help="Add this signed delta to the current quantity",
    )
    parser.add_argument(
        "--offset",
        type=parse_int,
        default=ITEM_TABLE_OFFSET,
        help=f"Item table offset (default: {format_hex(ITEM_TABLE_OFFSET)})",
    )
    parser.add_argument(
        "--slot-size",
        type=int,
        default=ITEM_SLOT_SIZE,
        help=f"Bytes per item slot (default: {ITEM_SLOT_SIZE})",
    )
    parser.add_argument(
        "--max-slots",
        type=int,
        default=DEFAULT_MAX_SLOTS,
        help=f"How many slots to scan (default: {DEFAULT_MAX_SLOTS})",
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Do not create a .bak file before writing",
    )
    return parser



def main():
    import argparse
    p = argparse.ArgumentParser(description="Minimal PAL DOS item editor")
    p.add_argument('save_file', nargs='?', help='Save file (e.g. 4.RPG)')
    p.add_argument('--list', action='store_true', help='List inventory')
    p.add_argument('--edit', type=int, help='Slot index to edit (0-based)')
    p.add_argument('--item', type=int, help='Item code to set')
    p.add_argument('--qty', type=int, help='Quantity to set')
    p.add_argument('--list-all-items', action='store_true', help='List all item codes/names from WORD.DAT')
    args = p.parse_args()

    if args.list_all_items:
        list_all_items()
        return

    if not args.save_file:
        p.error('save_file required unless --list-all-items')

    save_path = Path(args.save_file)
    # default WORD.DAT to the same directory as the save file when available
    global WORD_DAT
    candidate = save_path.parent / 'WORD.DAT'
    if candidate.exists():
        WORD_DAT = candidate
    else:
        # Fallback to relative to script
        WORD_DAT = Path(__file__).resolve().parent.parent.parent / 'palgame' / 'WORD.DAT'

    data = bytearray(save_path.read_bytes())
    slots = read_slots(data, ITEM_TABLE_OFFSET, ITEM_SLOT_SIZE, MAX_SLOTS)

    if args.list:
        print_slots(slots)
        return

    if args.edit is not None:
        if args.item is None or args.qty is None:
            p.error('--edit requires --item and --qty')
        idx = args.edit
        if not (0 <= idx < len(slots)):
            p.error('Invalid slot index')
        off = ITEM_TABLE_OFFSET + idx * ITEM_SLOT_SIZE
        data[off:off+2] = args.item.to_bytes(2, 'little')
        data[off+2:off+4] = args.qty.to_bytes(2, 'little')
        Path(args.save_file).write_bytes(data)
        print(f"Edited slot {idx}: item={args.item} qty={args.qty}")
        return

    p.error('No action specified')

if __name__ == '__main__':
    main()
