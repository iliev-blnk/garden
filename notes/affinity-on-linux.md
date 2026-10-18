---
title: Affinity on Linux
topics: [projects]
stage: budding
planted: 2026-10-18
tended: 2026-10-18
summary: Getting Affinity 3 (the Windows version) running under Wine on my Arch laptop, and driving it from Claude through its built-in MCP server.
---

I wanted Affinity 3 for design work without leaving Linux. There is no native build, so I installed the Windows MSIX under Wine. I followed the AffinityOnLinux community recipe, but did the steps by hand, because its installer only works through a GUI and can't take an .msix file.

## Status

Affinity 3.3.1 runs under a patched Wine build (ElementalWarrior's, version 11.19) in its own prefix. It has a launcher and a desktop entry, and the Canva sign-in callback works. GPU acceleration beyond plain Vulkan rendering is not set up yet.

I also turned on Affinity's built-in Model Context Protocol server and connected it to Claude Code, so Claude can make edits in a running Affinity session.

## Decisions

- I keep Wine, the prefix and an env script in one self-contained folder, so the setup doesn't touch the system Wine.
- I set the Windows version to Windows 11 and use the Vulkan renderer.
- For background cutouts I use local rembg with the isnet-general-use model. Affinity's own subject selection and background removal only work with Canva's AI features turned on.

## Lessons

- The MSIX is a zip, but file names inside it are URL-encoded (spaces stored as %20). They have to be decoded after extracting.
- Wine ships stub WinMetadata files. Affinity needs the real ones, except for a couple of Wine's own that have to stay.
- Sign-in needs the WinRT facade assemblies from the .NET 4.8 installer. Without them it fails quietly.
- The MCP toggle only takes effect after restarting Affinity, and the server only exists while Affinity is open.
- The MCP API is narrower than the app. There is no gradient map, no mesh warp, and files can only be loaded from the Desktop.
- One silent startup crash came from the recent-files list pointing at a file saved over MCP. Clearing that entry fixed it. Reading the crash dumps pointed me there; the obvious suspects were red herrings.
- The birefnet-portrait model used more memory than my laptop has and froze the whole machine. I don't run it.

## Next

- Try vkd3d/DXVK and OpenCL for proper GPU acceleration on the NVIDIA card.
- Use the MCP connection on real design work, not just test edits.
