#!/bin/bash

# Release script for Kalpavriksha Book Library
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if release type is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Release type not specified${NC}"
    echo "Usage: ./scripts/release.sh [patch|minor|major]"
    echo ""
    echo "  patch - for bug fixes (0.1.4 -> 0.1.5)"
    echo "  minor - for new features (0.1.4 -> 0.2.0)"
    echo "  major - for breaking changes (0.1.4 -> 1.0.0)"
    exit 1
fi

RELEASE_TYPE=$1

# Validate release type
if [[ ! "$RELEASE_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${RED}Error: Invalid release type '$RELEASE_TYPE'${NC}"
    echo "Must be one of: patch, minor, major"
    exit 1
fi

echo -e "${BLUE}=== Kalpavriksha Book Library Release ===${NC}"
echo ""

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${GREEN}$CURRENT_VERSION${NC}"

# Calculate new version
case $RELEASE_TYPE in
    patch)
        NEW_VERSION=$(node -p "require('semver').inc('$CURRENT_VERSION', 'patch')" 2>/dev/null || echo "")
        ;;
    minor)
        NEW_VERSION=$(node -p "require('semver').inc('$CURRENT_VERSION', 'minor')" 2>/dev/null || echo "")
        ;;
    major)
        NEW_VERSION=$(node -p "require('semver').inc('$CURRENT_VERSION', 'major')" 2>/dev/null || echo "")
        ;;
esac

# Fallback if semver is not installed
if [ -z "$NEW_VERSION" ]; then
    IFS='.' read -r -a version_parts <<< "$CURRENT_VERSION"
    major="${version_parts[0]}"
    minor="${version_parts[1]}"
    patch="${version_parts[2]}"
    
    case $RELEASE_TYPE in
        patch)
            NEW_VERSION="$major.$minor.$((patch + 1))"
            ;;
        minor)
            NEW_VERSION="$major.$((minor + 1)).0"
            ;;
        major)
            NEW_VERSION="$((major + 1)).0.0"
            ;;
    esac
fi

echo -e "New version: ${GREEN}$NEW_VERSION${NC}"
echo ""

# Ask for confirmation
read -p "Continue with this release? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Release cancelled"
    exit 0
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}Error: You have uncommitted changes${NC}"
    echo "Please commit or stash your changes before releasing"
    git status -s
    exit 1
fi

# Create release notes file if it doesn't exist
RELEASE_NOTES_FILE="RELEASE_NOTES.md"
echo "## What's New in v$NEW_VERSION" > $RELEASE_NOTES_FILE
echo "" >> $RELEASE_NOTES_FILE
echo "### Changes" >> $RELEASE_NOTES_FILE
echo "- " >> $RELEASE_NOTES_FILE
echo "" >> $RELEASE_NOTES_FILE

# Open editor for release notes
echo ""
echo -e "${BLUE}Please edit release notes...${NC}"
${EDITOR:-nano} $RELEASE_NOTES_FILE

# Check if release notes were edited
if ! grep -q "^- ." $RELEASE_NOTES_FILE; then
    echo -e "${RED}Warning: No release notes added${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        rm $RELEASE_NOTES_FILE
        echo "Release cancelled"
        exit 0
    fi
fi

echo ""
echo -e "${BLUE}Creating release v$NEW_VERSION...${NC}"

# Bump version, create commit and tag
npm version $RELEASE_TYPE -m "Release v%s"

# Add release notes to commit if modified
if [ -f $RELEASE_NOTES_FILE ]; then
    git add $RELEASE_NOTES_FILE
    git commit --amend --no-edit
fi

# Push commits and tags
echo ""
echo -e "${BLUE}Pushing to GitHub...${NC}"
git push
git push --tags

echo ""
echo -e "${GREEN}✓ Release v$NEW_VERSION created successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. GitHub Actions will build the installers automatically"
echo "  2. Go to https://github.com/yashjawale/kalpavriksha-book-library/releases"
echo "  3. Edit the draft release if needed"
echo "  4. Click 'Publish release' when ready"
echo ""
