function greet(name) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Hello, stranger!";
  }
  return `Hello, ${trimmed}!`;
}

function sumRange(start, end) {
  let total = 0;
  for (let i = start; i <= end; i += 1) {
    total += i;
  }
  return total;
}

module.exports = { greet, sumRange };
