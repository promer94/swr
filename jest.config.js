module.exports = {
  preset: 'ts-jest',
  testRegex: '/test/.*\\.test\\.tsx$',
  globals: {
    'ts-jest': {
      diagnostics: false /**{
        warnOnly: true
      } */
    }
  },
  modulePathIgnorePatterns: ['<rootDir>/examples/']
}