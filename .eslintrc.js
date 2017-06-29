
module.exports = {
  root: true,
  extends: 'airbnb-base',
  rules: {
    'no-console': 'off',
    semi: ['error', 'never'],
    'brace-style': ['error', 'stroustrup', {
      allowSingleLine: false,
    }],
    'prefer-arrow-callback': ['error', {
      allowNamedFunctions: true,
      allowUnboundThis: true,
    }],
    'space-before-function-paren': ['error', {
      anonymous: 'never',
      named: 'never',
      asyncArrow: 'always',
    }],
  },
}
