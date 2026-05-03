#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
from dataclasses import dataclass
from pathlib import Path

OFFSET_SAVED_TIMES = 0x00
SAVED_TIMES_WIDTH = 2
OFFSET_CASH = 0x28
CASH_WIDTH = 4

PLAYER_ROLES_BASE = 0x01FC
EXP_BASE = 0x007C
PLAYER_STATS_BASE = PLAYER_ROLES_BASE + 0x54
EQUIPMENT_BASE = PLAYER_ROLES_BASE + 0x84
MAX_PLAYER_ROLES = 6
MAX_PLAYABLE_PLAYER_ROLES = 5
MAX_PLAYER_EQUIPMENTS = 6
NUM_MAGIC_ELEMENTAL = 5
ROLE_STRIDE = 2
EXP_STRIDE = 8
STAT_BLOCK_BYTES = MAX_PLAYER_ROLES * ROLE_STRIDE
EQUIPMENT_BLOCK_BYTES = MAX_PLAYER_EQUIPMENTS * MAX_PLAYER_ROLES * ROLE_STRIDE
POISON_RESISTANCE_BASE = EQUIPMENT_BASE + EQUIPMENT_BLOCK_BYTES + STAT_BLOCK_BYTES * 5
ELEMENTAL_RESISTANCE_BASE = POISON_RESISTANCE_BASE + STAT_BLOCK_BYTES
U16_MAX = 0xFFFF
CASH_MAX = 999_999
HPMP_MAX = 9_999
STAT_MAX = 999
RESIST_MAX = 255


@dataclass(frozen=True)
class FieldSpec:
    base_offset: int
    width: int
    role_stride: int
    max_val: int


FIELD_SPECS: dict[str, FieldSpec] = {
    "exp":   FieldSpec(EXP_BASE,                                               2, EXP_STRIDE,  U16_MAX),
    "hp":    FieldSpec(PLAYER_STATS_BASE + 0x18,                               2, ROLE_STRIDE, HPMP_MAX),
    "maxhp": FieldSpec(PLAYER_STATS_BASE + 0x00,                               2, ROLE_STRIDE, HPMP_MAX),
    "mp":    FieldSpec(PLAYER_STATS_BASE + 0x24,                               2, ROLE_STRIDE, HPMP_MAX),
    "maxmp": FieldSpec(PLAYER_STATS_BASE + 0x0C,                               2, ROLE_STRIDE, HPMP_MAX),
    "atk":   FieldSpec(EQUIPMENT_BASE + EQUIPMENT_BLOCK_BYTES,                 2, ROLE_STRIDE, STAT_MAX),
    "matk":  FieldSpec(EQUIPMENT_BASE + EQUIPMENT_BLOCK_BYTES + STAT_BLOCK_BYTES,     2, ROLE_STRIDE, STAT_MAX),
    "def":   FieldSpec(EQUIPMENT_BASE + EQUIPMENT_BLOCK_BYTES + STAT_BLOCK_BYTES * 2, 2, ROLE_STRIDE, STAT_MAX),
    "dex":   FieldSpec(EQUIPMENT_BASE + EQUIPMENT_BLOCK_BYTES + STAT_BLOCK_BYTES * 3, 2, ROLE_STRIDE, STAT_MAX),
    "flee":  FieldSpec(EQUIPMENT_BASE + EQUIPMENT_BLOCK_BYTES + STAT_BLOCK_BYTES * 4, 2, ROLE_STRIDE, STAT_MAX),
    "poison": FieldSpec(POISON_RESISTANCE_BASE,                                 2, ROLE_STRIDE, RESIST_MAX),
    "wind":   FieldSpec(ELEMENTAL_RESISTANCE_BASE + STAT_BLOCK_BYTES * 0,       2, ROLE_STRIDE, RESIST_MAX),
    "thunder": FieldSpec(ELEMENTAL_RESISTANCE_BASE + STAT_BLOCK_BYTES * 1,      2, ROLE_STRIDE, RESIST_MAX),
    "water":  FieldSpec(ELEMENTAL_RESISTANCE_BASE + STAT_BLOCK_BYTES * 2,       2, ROLE_STRIDE, RESIST_MAX),
    "fire":   FieldSpec(ELEMENTAL_RESISTANCE_BASE + STAT_BLOCK_BYTES * 3,       2, ROLE_STRIDE, RESIST_MAX),
    "earth":  FieldSpec(ELEMENTAL_RESISTANCE_BASE + STAT_BLOCK_BYTES * 4,       2, ROLE_STRIDE, RESIST_MAX),
}


def parse_int(value: str) -> int:
    return int(value, 0)


def validate_range(name: str, value: int, min_value: int, max_value: int) -> None:
    if not min_value <= value <= max_value:
        raise ValueError(f"{name} must be between {min_value} and {max_value}, got {value}")


def save_backup(path: Path) -> Path:
    backup_path = path.with_suffix(path.suffix + ".bak")
    shutil.copy2(path, backup_path)
    return backup_path


def load_save(path: Path) -> bytearray:
    return bytearray(path.read_bytes())


def field_offset(spec: FieldSpec, role: int) -> int:
    return spec.base_offset + role * spec.role_stride


def read_value(data: bytes, offset: int, width: int) -> int:
    return int.from_bytes(data[offset : offset + width], "little")


def write_value(data: bytearray, offset: int, width: int, value: int) -> None:
    data[offset : offset + width] = value.to_bytes(width, "little")


def print_role_overview(data: bytes, role: int) -> None:
    print(f"Role {role}:")
    for name, spec in FIELD_SPECS.items():
        current_value = read_value(data, field_offset(spec, role), spec.width)
        print(f"  {name}: {current_value}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Minimal PAL DOS save editor")
    parser.add_argument("save_file", help="Save file (e.g. 4.RPG)")
    parser.add_argument("new_cash", nargs="?", help="Set cash amount")
    parser.add_argument(
        "--field",
        choices=sorted(FIELD_SPECS),
        help="Per-role field to read or write",
    )
    parser.add_argument("--role", type=parse_int, help="Role index (0..4)")
    parser.add_argument("--set", dest="set_value", type=parse_int, help="Value to write")
    parser.add_argument("--saves", type=parse_int, metavar="N", help="Set save counter (wSavedTimes)")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    save_path = Path(args.save_file)
    data = load_save(save_path)

    if args.field is None:
        if args.set_value is not None:
            parser.error("--set requires --field")
        if args.role is not None:
            if args.new_cash is not None or args.saves is not None:
                parser.error("use either positional cash editing or --role, not both")
            validate_range("role", args.role, 0, MAX_PLAYABLE_PLAYER_ROLES - 1)
            print_role_overview(data, args.role)
            return 0
        if args.saves is not None:
            if args.new_cash is not None:
                parser.error("use either positional cash editing or --saves, not both")
            validate_range("saves", args.saves, 0, U16_MAX)
            cur = read_value(data, OFFSET_SAVED_TIMES, SAVED_TIMES_WIDTH)
            save_backup(save_path)
            write_value(data, OFFSET_SAVED_TIMES, SAVED_TIMES_WIDTH, args.saves)
            save_path.write_bytes(data)
            print(f"wSavedTimes: {cur} -> {args.saves}")
            return 0
        if args.new_cash is None:
            cash = read_value(data, OFFSET_CASH, CASH_WIDTH)
            saves = read_value(data, OFFSET_SAVED_TIMES, SAVED_TIMES_WIDTH)
            print(f"Current cash: {cash}")
            print(f"Save counter:  {saves}")
            return 0

        new_cash = int(args.new_cash)
        validate_range("cash", new_cash, 0, CASH_MAX)
        save_backup(save_path)
        write_value(data, OFFSET_CASH, CASH_WIDTH, new_cash)
        save_path.write_bytes(data)
        print(f"Cash set to: {new_cash}")
        return 0

    if args.new_cash is not None:
        parser.error("use either positional cash editing or --field, not both")
    if args.saves is not None:
        parser.error("--saves cannot be combined with --field")
    if args.role is None:
        parser.error("--field requires --role")
    validate_range("role", args.role, 0, MAX_PLAYABLE_PLAYER_ROLES - 1)

    spec = FIELD_SPECS[args.field]
    offset = field_offset(spec, args.role)
    current_value = read_value(data, offset, spec.width)

    if args.set_value is None:
        print(f"Field {args.field} role {args.role}: {current_value}")
        return 0

    validate_range(args.field, args.set_value, 0, spec.max_val)
    save_backup(save_path)
    write_value(data, offset, spec.width, args.set_value)
    save_path.write_bytes(data)
    print(f"Field {args.field} role {args.role}: {current_value} -> {args.set_value}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
