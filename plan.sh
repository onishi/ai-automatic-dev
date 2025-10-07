
#!/bin/bash

for i in {1..10}; do
  echo "=== Iteration $i/10 ==="

  echo "Running: claude"
  claude -p "README.md に従って開発を進めてください" --output-format text --allowedTools Write "Bash(mkdir:*)" "Bash(git add:*)" "Bash(git diff:*)" "Bash(git log:*)" "Bash(git commit:*)" "Bash(git tag:*)"
  if [ $? -ne 0 ]; then
    echo "Error: claude failed at iteration $i" >&2
    exit 1
  fi

  echo "Waiting 1 minutes..."
  sleep 60
done

echo "All iterations completed successfully"
