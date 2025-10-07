
#!/bin/bash

for i in {1..10}; do
  echo "=== Iteration $i/10 ==="

  echo "Crearing: claude"
  claude -p "/clear"

  for j in {1..4}; do

    echo "Running: claude ${i}-$j"
    claude -p "README.md に従って開発を進めてください" --output-format text --allowedTools Write Edit "Bash(mkdir:*)" "Bash(git add:*)" "Bash(git diff:*)" "Bash(git log:*)" "Bash(git commit:*)" "Bash(git tag:*)"
    if [ $? -ne 0 ]; then
        echo "Error: claude failed at iteration $i" >&2
        exit 1
    fi

  done

  echo "Waiting 5 minutes..."
  sleep 300
done

echo "All iterations completed successfully"
