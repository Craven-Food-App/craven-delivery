# Android Build Troubleshooting Guide

## Windows File Access Issues

If you're encountering errors like:
```
Cannot access output property 'annotationProcessorListFile' of task ':app:javaPreCompileDebug'
Could not stat file ... (errno 5)
AccessDeniedException
```

This is a Windows file system locking issue. Here are solutions:

### Solution 1: Exclude Build Directory from Antivirus (Recommended)

1. Open Windows Defender (or your antivirus software)
2. Add exclusions for:
   - `D:\Repositories\craven-delivery\apps\customer\android\build`
   - `D:\Repositories\craven-delivery\apps\customer\android\app\build`
   - `D:\Repositories\craven-delivery\apps\customer\android\.gradle`

### Solution 2: Enable Long Path Support (Windows 10/11)

1. Open PowerShell as Administrator
2. Run:
   ```powershell
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```
3. Restart your computer

### Solution 3: Close All Processes

1. Close Android Studio, VS Code, or any IDE
2. Stop all Gradle daemons:
   ```powershell
   cd D:\Repositories\craven-delivery\apps\customer\android
   .\gradlew.bat --stop
   ```
3. Wait 10 seconds, then try building again

### Solution 4: Build from Android Studio

Instead of command line, try building from Android Studio:
1. Open Android Studio
2. Open the project: `apps/customer/android`
3. Build > Make Project

### Solution 5: Use WSL (Windows Subsystem for Linux)

If you have WSL installed:
```bash
cd /mnt/d/Repositories/craven-delivery/apps/customer/android
./gradlew assembleDebug
```

### Solution 6: Manual Clean (If files are locked)

1. Restart your computer
2. Immediately after restart, delete the build directories:
   ```powershell
   Remove-Item -Recurse -Force "D:\Repositories\craven-delivery\apps\customer\android\app\build"
   Remove-Item -Recurse -Force "D:\Repositories\craven-delivery\apps\customer\android\build"
   ```
3. Then build again

## Current Configuration

The `gradle.properties` has been updated with:
- Configuration cache disabled
- Parallel builds disabled
- These settings help avoid file locking issues

## If Issues Persist

1. Check Windows Event Viewer for file system errors
2. Check if any backup/cloud sync software is accessing the files
3. Try moving the project to a shorter path (e.g., `C:\dev\customer-app`)
4. Contact your IT department if on a corporate network


