const fs = require('fs')
const path = require('path')
const {
  withAndroidManifest,
  withAppBuildGradle,
  withMainApplication,
  withDangerousMod,
  AndroidConfig,
} = require('@expo/config-plugins')

const BUBBLE_PACKAGE = 'com.screenshotbubble'

function addBubblePermissions(manifest) {
  if (!manifest.manifest.$) {
    manifest.manifest.$ = {}
  }
  if (!manifest.manifest.$['xmlns:tools']) {
    manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools'
  }

  const permissions = [
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
    {
      $: {
        'android:name': 'android.permission.PACKAGE_USAGE_STATS',
        'tools:ignore': 'ProtectedPermissions',
      },
    },
  ]

  if (!manifest.manifest['uses-permission']) {
    manifest.manifest['uses-permission'] = []
  }

  for (const perm of permissions) {
    const name = typeof perm === 'string' ? perm : perm.$['android:name']
    const exists = manifest.manifest['uses-permission'].some(p => p.$?.['android:name'] === name)
    if (!exists) {
      manifest.manifest['uses-permission'].push(
        typeof perm === 'string' ? { $: { 'android:name': perm } } : perm,
      )
    }
  }

  return manifest
}

function addBubbleServices(manifest) {
  const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest)
  app.service = app.service ?? []

  const services = [
    {
      $: {
        'android:name': `${BUBBLE_PACKAGE}.ScreenshotBubbleService`,
        'android:foregroundServiceType': 'mediaProjection',
        'android:exported': 'false',
      },
    },
    {
      $: {
        'android:name': `${BUBBLE_PACKAGE}.ScreenshotHeadlessTaskService`,
        'android:exported': 'false',
      },
    },
  ]

  for (const service of services) {
    const name = service.$['android:name']
    const exists = app.service.some(s => s.$?.['android:name'] === name)
    if (!exists) {
      app.service.push(service)
    }
  }

  return manifest
}

function addGradleDependencies(buildGradle) {
  const dep = "implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'"
  if (!buildGradle.contents.includes(dep)) {
    buildGradle.contents = buildGradle.contents.replace(
      /dependencies\s*\{/,
      `dependencies {\n    ${dep}`,
    )
  }
  return buildGradle
}

function patchMainApplication(mainApplication) {
  const importLine = `import ${BUBBLE_PACKAGE}.BubblePackage`
  let contents = mainApplication.contents

  if (!contents.includes(importLine)) {
    contents = contents.replace(/^(package .+\n)/m, `$1\n${importLine}\n`)
  }

  if (!contents.includes('BubblePackage()')) {
    contents = contents.replace(
      /(PackageList\(this\)\.packages\.apply\s*\{[^}]*)(}\))/s,
      `$1      add(BubblePackage())\n    $2`,
    )
    if (!contents.includes('BubblePackage()')) {
      contents = contents.replace(
        /(val packages = PackageList\(this\)\.packages)/,
        `$1\n            packages.add(BubblePackage())`,
      )
    }
  }

  mainApplication.contents = contents
  return mainApplication
}

function copyBubbleSources(projectRoot, platformRoot) {
  const srcDir = path.join(projectRoot, 'native', 'android', 'screenshotbubble')
  const destDir = path.join(
    platformRoot,
    'app',
    'src',
    'main',
    'java',
    'com',
    'screenshotbubble',
  )

  fs.mkdirSync(destDir, { recursive: true })

  for (const file of fs.readdirSync(destDir)) {
    if (file.endsWith('.java') || file.endsWith('.kt')) {
      fs.unlinkSync(path.join(destDir, file))
    }
  }

  for (const file of fs.readdirSync(srcDir)) {
    if (file.endsWith('.kt')) {
      fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file))
    }
  }

  const legacyOverlayDir = path.join(
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
  if (fs.existsSync(legacyOverlayDir)) {
    for (const file of fs.readdirSync(legacyOverlayDir)) {
      if (file.endsWith('.kt') || file.endsWith('.java')) {
        fs.unlinkSync(path.join(legacyOverlayDir, file))
      }
    }
  }
}

function withSpendSenseOverlay(config) {
  config = withAndroidManifest(config, config => {
    config.modResults = addBubblePermissions(config.modResults)
    config.modResults = addBubbleServices(config.modResults)
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
      copyBubbleSources(config.modRequest.projectRoot, config.modRequest.platformProjectRoot)
      return config
    },
  ])

  return config
}

module.exports = withSpendSenseOverlay
