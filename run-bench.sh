#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="image-processing-benchmark"
IMAGE_TAG="latest"
CONTAINER_NAME="img-bench-$$_"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FIXTURES_DIR=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [options] [--] [benchmark-flags]

Options:
  --fixtures-dir DIR   Mount a custom fixtures directory into the container
  --build              Force rebuild the Docker image
  --help               Show this help

Benchmark flags (passed through to the container):
  --adapters ADAPTERS  Comma-separated adapter names (default: sharp,bun)
  --ops OPS            Comma-separated operation IDs (default: all)
  --warmup N           Warmup iterations (default: 10)
  --iterations N       Measure iterations (default: 50)
  --format FORMAT      Output format: table|json|csv|html (default: table)
  --poll-interval MS   RSS polling interval in ms (default: 10)

Examples:
  $(basename "$0") --format html > results.html
  $(basename "$0") --adapters sharp --ops resize_down_half --iterations 20
  $(basename "$0") --fixtures-dir ./my-fixtures --format json > results.json
EOF
}

FORCE_BUILD=false
PASS_THROUGH=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --fixtures-dir)
      FIXTURES_DIR="$2"
      shift 2
      ;;
    --build)
      FORCE_BUILD=true
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    --)
      shift
      PASS_THROUGH+=("$@")
      break
      ;;
    *)
      PASS_THROUGH+=("$1")
      shift
      ;;
  esac
done

if $FORCE_BUILD || ! docker image inspect "$IMAGE_NAME:$IMAGE_TAG" &>/dev/null; then
  echo "Building Docker image..." >&2
  docker build -t "$IMAGE_NAME:$IMAGE_TAG" "$SCRIPT_DIR" >&2
fi

VOLUME_ARGS=()
if [[ -n "$FIXTURES_DIR" ]]; then
  ABS_FIXTURES="$(cd "$FIXTURES_DIR" && pwd)"
  VOLUME_ARGS=(-v "$ABS_FIXTURES:/app/fixtures:ro")
fi

docker run --rm ${VOLUME_ARGS[@]+"${VOLUME_ARGS[@]}"} "$IMAGE_NAME:$IMAGE_TAG" "${PASS_THROUGH[@]}"
