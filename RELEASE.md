# Release Process

This document describes how to create new releases for Kalpavriksha Book Library.

## Quick Release (Recommended)

Use the automated release script for the smoothest experience:

```bash
# For bug fixes (0.1.4 → 0.1.5)
./scripts/release.sh patch

# For new features (0.1.4 → 0.2.0)
./scripts/release.sh minor

# For breaking changes (0.1.4 → 1.0.0)
./scripts/release.sh major
```

The script will:

1. ✓ Calculate the new version number
2. ✓ Open your editor for release notes
3. ✓ Update `package.json` with the new version
4. ✓ Create a git commit with the version bump
5. ✓ Create a git tag (e.g., `v0.2.0`)
6. ✓ Push everything to GitHub
7. ✓ Trigger GitHub Actions to build installers

## NPM Scripts (Alternative)

If you prefer npm commands:

```bash
npm run release:patch   # Bug fixes
npm run release:minor   # New features
npm run release:major   # Breaking changes
```

These scripts:

- Bump version in `package.json`
- Create git tag
- Push to GitHub

**Note:** You'll need to manually create `RELEASE_NOTES.md` before running these.

## Manual Process

If you need full control:

```bash
# 1. Update version
npm version patch --no-git-tag-version

# 2. Create release notes
cat > RELEASE_NOTES.md << EOF
## What's New in v0.2.0
- Feature 1
- Feature 2
EOF

# 3. Commit changes
git add package.json RELEASE_NOTES.md
git commit -m "Release v0.2.0"

# 4. Create and push tag
git tag v0.2.0
git push
git push --tags
```

## After Pushing the Tag

1. **GitHub Actions automatically**:
   - Builds installers for Linux and Windows
   - Creates a **draft release** with your notes
   - Uploads all installer files

2. **You must manually** (on GitHub):
   - Go to [Releases page](https://github.com/yashjawale/kalpavriksha-book-library/releases)
   - Find the draft release
   - Review the release notes
   - Click **"Publish release"**

## Version Numbering

Following [Semantic Versioning](https://semver.org/):

- **Patch** (0.1.4 → 0.1.5): Bug fixes, minor changes
- **Minor** (0.1.4 → 0.2.0): New features, backward compatible
- **Major** (0.1.4 → 1.0.0): Breaking changes

## What Gets Built

The GitHub Actions workflow builds:

### Linux

- `.AppImage` - Portable application
- `.deb` - Debian/Ubuntu package
- `.rpm` - RedHat/Fedora package
- `.tar.gz` - Archive

### Windows

- `.exe` - Installer
- `.msi` - MSI installer
- `.zip` - Portable archive

All files are named with the version: `kalpavriksha-book-library-0.2.0.exe`

## Troubleshooting

### "You have uncommitted changes"

Commit or stash your changes before releasing:

```bash
git add .
git commit -m "Prepare for release"
```

### Build fails on GitHub Actions

- Check the [Actions tab](https://github.com/yashjawale/kalpavriksha-book-library/actions)
- Look for error messages in the workflow logs
- Common issues: syntax errors, missing dependencies

### Version not showing in app

- Ensure `package.json` version is correct
- Rebuild the app: `npm run build`
- The About dialog reads from `app.getVersion()` which uses `package.json`
