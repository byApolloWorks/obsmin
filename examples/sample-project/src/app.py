def greet(name: str) -> str:
    trimmed = name.strip()
    if not trimmed:
        return "Hello, stranger!"
    return f"Hello, {trimmed}!"


def sum_range(start: int, end: int) -> int:
    total = 0
    for i in range(start, end + 1):
        total += i
    return total


if __name__ == "__main__":
    print(greet("obsmin"))
    print(sum_range(1, 10))
