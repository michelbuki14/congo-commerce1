# third_party

Vendored copies of pub packages that need a local patch. Each directory has a
`README.md` recording why the patch is necessary and when to drop it.

## flutter_secure_storage_windows

Vendored from **4.2.2** (unchanged except for the patch below).

**Why:** `flutter_secure_storage` ships a Windows backend whose C++ source
includes `<atlstr.h>`, which requires the *ATL for latest v143 build tools*
component of the Visual Studio C++ workload. Without that component,
`flutter build windows` fails:

    error C1083: Cannot open include file: 'atlstr.h': No such file or directory

Installing ATL is not a viable fix on the build machines in use: the Visual
Studio installer requires interactive UAC elevation (`setup.exe` returns exit
87 when unelevated, and the elevation prompt was declined), so the build
cannot be made reproducible unattended.

The pubspec for every published version of this plugin
(`flutter_secure_storage` 9.x through 11.x, and the Windows backend 3.x/4.x)
pulls in a Windows implementation with that same include, so there is no
combination of dependency constraints that avoids it. Platform-scoped
dependencies are not expressible in this project's pub version, either.

**The patch:** the plugin's C++ source used ATL for exactly five narrow-string
conversions and nothing else. `CA2W`/`CW2A` are replaced with two local helpers
in `windows/flutter_secure_storage_windows_plugin.cpp`:

- `AcpToWide(std::string)` — wraps `MultiByteToWideChar(CP_ACP, ...)`.
- `WideToAcp(const wchar_t*)` — wraps `WideCharToMultiByte(CP_ACP, ...)`.

`CP_ACP` matches ATL's default conversion code page, so credential target names
resolve to the same strings as before and already-persisted credentials stay
readable. One site assigns to `CREDENTIALW::TargetName`, which is a non-const
`LPWSTR`; that gets a `const_cast` that is safe because `CredWriteW` only reads
it (ATL's `m_psz` was equally mutable).

Nothing else in the 849-line file touches ATL, and no other file in the package
includes it.

**Drop this when:** upstream removes the stale include, or the build machines
have the ATL component installed. Upstream fix would be a one-line PR at
https://github.com/juliansteenbakker/flutter_secure_storage.

To refresh against a newer upstream release, copy the package out of the pub
cache, re-apply the include removal, and bump `version:` in the local
`pubspec.yaml` (pub requires a version distinct from the hosted one for a path
override to be picked up cleanly).
