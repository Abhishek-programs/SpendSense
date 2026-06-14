import { AppRegistry } from 'react-native'

AppRegistry.registerHeadlessTask('ScreenshotTask', () => async (taskData) => {
  if (taskData && taskData.screenshotPath) {
    try {
      const { runScreenshotHeadlessTask } = require('./lib/overlay-headless')
      await runScreenshotHeadlessTask(taskData.screenshotPath)
    } catch (error) {
      console.error('Headless runner failed to execute background OCR pipeline wrapper', error)
    }
  }
})

import 'expo-router/entry'
