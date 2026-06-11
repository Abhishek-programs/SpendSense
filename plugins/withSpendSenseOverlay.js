const fs = require('fs')
const path = require('path')
const {
  withAndroidManifest,
  withAppBuildGradle,
  withMainApplication,
  withDangerousMod,
  AndroidConfig,
} = require('@expo/config-plugins')

const PACKAGE = 'com.anonymous.SpendSense'
const OVERLAY_PACKAGE = `${PACKAGE}.overlay`

function addOverlayPermissions(manifest) {
  const permissions = [
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
  ]
  if (!manifest.manifest['uses-permission']) {
    manifest.manifest['uses-permission'] = []
  }
  for (const name of permissions) {
    const exists = manifest.manifest['uses-permission'].some(
      p => p.$?.['android:name'] === name,
    )
    if (!exists) {
      manifest.manifest['uses-permission'].push({ $: { 'android:name': name } })
    }
  }
  return manifest
}

function addOverlayService(manifest) {
  const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest)
  app.service = app.service ?? []
  const serviceName = `.overlay.OverlayService`
  const exists = app.service.some(s => s.$?.['android:name'] === serviceName)
  if (!exists) {
    app.service.push({
      $: {
        'android:name': serviceName,
        'android:foregroundServiceType': 'mediaProjection',
        'android:exported': 'false',
      },
    })
  }
  return manifest
}

function addGradleDependencies(buildGradle) {
  const deps = [
    "implementation 'com.google.mlkit:text-recognition:16.0.1'",
    "implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3'",
    "implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'",
  ]
  let contents = buildGradle.contents
  for (const dep of deps) {
    if (!contents.includes(dep)) {
      contents = contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    ${dep}`,
      )
    }
  }
  buildGradle.contents = contents
  return buildGradle
}

function patchMainApplication(mainApplication) {
  const importLine = `import ${OVERLAY_PACKAGE}.OverlayPackage`
  if (!mainApplication.contents.includes(importLine)) {
    mainApplication.contents = mainApplication.contents.replace(
      /^(package .+\n)/m,
      `$1\n${importLine}\n`,
    )
  }
  if (!mainApplication.contents.includes('OverlayPackage()')) {
    mainApplication.contents = mainApplication.contents.replace(
      /(PackageList\(this\)\.packages\.apply\s*\{[^}]*)(}\))/s,
      `$1      add(OverlayPackage())\n    $2`,
    )
    if (!mainApplication.contents.includes('OverlayPackage()')) {
      mainApplication.contents = mainApplication.contents.replace(
        /(val packages = PackageList\(this\)\.packages)/,
        `$1\n            packages.add(OverlayPackage())`,
      )
    }
  }
  return mainApplication
}

function copyOverlaySources(projectRoot, platformRoot) {
  const srcDir = path.join(projectRoot, 'native', 'android', 'overlay')
  const destDir = path.join(
    platformRoot,
    'app',
    'src',
    'main',
    'java',
    'com',
    'anonymous',
    'SpendSense',
    'overlay',
  )
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    if (file.endsWith('.kt')) {
      fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file))
    }
  }
}

function withSpendSenseOverlay(config) {
  config = withAndroidManifest(config, config => {
    config.modResults = addOverlayPermissions(config.modResults)
    config.modResults = addOverlayService(config.modResults)
    return config
  })

  config = withAppBuildGradle(config, config => {
    config.modResults = addGradleDependencies(config.modResults)
    return config
  })

  config = withMainApplication(config, config => {
    config.modResults = patchMainApplication(config.modResults)
    return config
  })

  config = withDangerousMod(config, [
    'android',
    async config => {
      copyOverlaySources(config.modRequest.projectRoot, config.modRequest.platformProjectRoot)
      return config
    },
  ])

  return config
}

module.exports = withSpendSenseOverlay
