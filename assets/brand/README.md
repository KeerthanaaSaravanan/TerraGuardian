# Brand Assets

## What

This directory is reserved for source brand files used to produce application logos, PWA icons and favicons.

## Responsibility

Keep source artwork and its provenance here. Built/public copies belong in the relevant app's `public/` directory; application components should reference those copies rather than duplicate artwork inline.

## Interfaces

The Operations Centre and Safe apps load public assets from their respective Vite public roots. Design tokens and UI behavior are maintained in the applications, not in this folder.

## Current implementation

No source logo, icon or typography package is currently stored in this directory. Existing rendered logo assets are maintained with the applications and documentation.

## Verification and boundaries

This is an asset location note, not an asset build pipeline. No brand-source validation or asset-generation command is defined here. Do not describe a file as an official government identity asset.

## Local development

When adding an asset, keep its editable source here and copy/export the reviewed runtime version into the owning app’s `public/` directory. No local command is required for this directory.
