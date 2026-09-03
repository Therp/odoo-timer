#!/usr/bin/env bash

# Therp Timer Desktop development helper.
#
# Usage:
#   bash scripts/dev.sh setup
#   bash scripts/dev.sh check
#   bash scripts/dev.sh templates
#   bash scripts/dev.sh run
#   bash scripts/dev.sh build
#   bash scripts/dev.sh clean
#
# Destructive cleanup is never performed automatically by "run" or "check".

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

NODE_VERSION="${NODE_VERSION:-22.23.2}"

NODEENV_DIR="${DESKTOP_DIR}/.nodeenv"
TOOLS_VENV="${DESKTOP_DIR}/.tools-venv"
OWL_DIR="${DESKTOP_DIR}/owl"

TEMPLATES_DIR="${DESKTOP_DIR}/templates"
TEMPLATES_JS="${DESKTOP_DIR}/renderer/js/templates.js"

EXPECTED_TEMPLATES=(
    "MessagesApp"
    "OptionsApp"
    "PopupApp"
    "ReadMore"
)

die() {
    echo
    echo "ERROR: $*" >&2
    exit 1
}

heading() {
    echo
    echo "============================================================"
    echo " $*"
    echo "============================================================"
}

activate_nodeenv() {
    [[ -x "${NODEENV_DIR}/bin/node" ]] || {
        die "Node environment missing. Run: bash scripts/dev.sh setup"
    }

    export PATH="${NODEENV_DIR}/bin:${PATH}"
    hash -r
}

check_node() {
    activate_nodeenv

    local actual
    actual="$(node --version)"

    if [[ "${actual}" != "v${NODE_VERSION}" ]]; then
        die "Expected Node v${NODE_VERSION}, found ${actual}."
    fi

    echo "✓ Node ${actual}"
    echo "  $(command -v node)"
}

check_electron() {
    [[ -f "${DESKTOP_DIR}/node_modules/electron/path.txt" ]] || {
        die "Electron binary is incomplete: node_modules/electron/path.txt is missing."
    }

    [[ -x "${DESKTOP_DIR}/node_modules/.bin/electron" ]] || {
        die "Electron executable wrapper is missing."
    }

    local version
    version="$("${DESKTOP_DIR}/node_modules/.bin/electron" --version)"

    echo "✓ Electron ${version}"
}

check_owl() {
    if [[ ! -e "${OWL_DIR}" ]]; then
        echo "○ OWL compiler checkout not created yet"
        return
    fi

    [[ -d "${OWL_DIR}/.git" ]] || {
        die "${OWL_DIR} exists but is not a Git repository.
Remove the generated directory with:
  bash scripts/dev.sh clean-owl
Then compile again."
    }

    local version
    version="$(git -C "${OWL_DIR}" describe --tags --always 2>/dev/null)"

    echo "✓ OWL ${version}"
}

check_templates() {
    [[ -f "${TEMPLATES_JS}" ]] || {
        die "Compiled templates are missing. Run: bash scripts/dev.sh templates"
    }

    local missing=0

    for template in "${EXPECTED_TEMPLATES[@]}"; do
        if grep -q "\"${template}\"" "${TEMPLATES_JS}"; then
            echo "✓ Template ${template}"
        else
            echo "✗ Template ${template}"
            missing=1
        fi
    done

    [[ "${missing}" -eq 0 ]] || {
        die "One or more compiled OWL templates are missing."
    }
}

templates_are_stale() {
    [[ -f "${TEMPLATES_JS}" ]] || return 0

    find "${TEMPLATES_DIR}" \
        -type f \
        -name '*.xml' \
        -newer "${TEMPLATES_JS}" \
        -print -quit |
        grep -q .
}

command_setup() {
    heading "Therp Timer Desktop — setup"

    bash "${SCRIPT_DIR}/setup.sh"

    activate_nodeenv

    check_node
    check_electron

    echo
    echo "Compiling Desktop OWL templates…"
    npm --prefix "${DESKTOP_DIR}" run compile-templates

    echo
    command_check
}

command_check() {
    heading "Therp Timer Desktop — environment check"

    check_node
    check_electron
    check_owl
    check_templates

    echo
    echo "✓ Desktop development environment looks healthy."
}

command_templates() {
    heading "Therp Timer Desktop — compile templates"

    check_node

    cd "${DESKTOP_DIR}"
    npm run compile-templates

    echo
    check_templates
}

command_run() {
    heading "Therp Timer Desktop — development run"

    check_node
    check_electron

    if templates_are_stale; then
        echo "OWL XML templates changed — recompiling…"
        command_templates
    else
        echo "✓ Compiled templates are up to date"
        check_templates
    fi

    echo
    echo "Starting Electron…"
    echo

    cd "${DESKTOP_DIR}"
    exec npm start
}

command_build() {
    heading "Therp Timer Desktop — Linux build"

    check_node
    check_electron

    if templates_are_stale; then
        command_templates
    else
        check_templates
    fi

    cd "${DESKTOP_DIR}"
    npm run build:linux
}

command_clean_owl() {
    heading "Removing generated OWL compiler checkout"

    if [[ -e "${OWL_DIR}" ]]; then
        rm -rf "${OWL_DIR}"
        echo "✓ Removed ${OWL_DIR}"
    else
        echo "OWL checkout does not exist."
    fi
}

command_clean() {
    heading "Removing generated Desktop dependencies"

    rm -rf \
        "${DESKTOP_DIR}/node_modules" \
        "${DESKTOP_DIR}/release"

    echo "✓ Removed node_modules/"
    echo "✓ Removed release/"
    echo
    echo "The Node environment and OWL compiler checkout were preserved."
}

command_help() {
    cat <<'EOF'
Therp Timer Desktop development helper

Usage:
  bash scripts/dev.sh COMMAND
  examples:
    - bash scripts/dev.sh setup
    - bash scripts/dev.sh setup

Commands:
  setup       Bootstrap and verify the complete environment
  check       Verify Node, Electron, OWL and compiled templates
  templates   Compile OWL XML templates
  run         Compile templates when needed and start Electron
  build       Compile if needed and build the Linux AppImage
  clean       Remove node_modules and packaged build output
  clean-owl   Remove only the generated OWL compiler checkout
  help        Show this help
EOF
}

case "${1:-help}" in
    setup)
        command_setup
        ;;
    check)
        command_check
        ;;
    templates)
        command_templates
        ;;
    run)
        command_run
        ;;
    build)
        command_build
        ;;
    clean)
        command_clean
        ;;
    clean-owl)
        command_clean_owl
        ;;
    help|-h|--help)
        command_help
        ;;
    *)
        die "Unknown command: $1. Run: bash scripts/dev.sh help"
        ;;
esac