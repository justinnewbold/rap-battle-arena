#!/bin/bash

# Install git pre-commit hook
echo "Installing git hooks..."

HOOK_PATH=".git/hooks/pre-commit"

cat > "$HOOK_PATH" << 'EOF'
#!/bin/sh

echo "🔍 Running pre-commit checks..."

# Run TypeScript type checking on staged files
echo "📝 Checking TypeScript types..."
npx tsc --noEmit 2>&1 | head -20
if [ $? -ne 0 ]; then
  echo "❌ TypeScript type checking failed"
  echo "Fix type errors before committing."
  exit 1
fi

# Run ESLint on staged files
echo "🔎 Running ESLint..."
npm run lint -- --max-warnings 0 2>&1 | head -30
if [ $? -ne 0 ]; then
  echo "❌ ESLint check failed"
  echo "Fix linting errors before committing."
  exit 1
fi

echo "✅ All pre-commit checks passed!"
exit 0
EOF

chmod +x "$HOOK_PATH"

echo "✅ Git hooks installed successfully!"
echo "Pre-commit hook will now run TypeScript and ESLint checks before each commit."
