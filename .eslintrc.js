
module.exports = {
  root: true,
  parser: 'babel-eslint',
  extends: 'airbnb-base',
  plugins: [
    'flowtype',
  ],
  rules: {
    'no-console': 'off',
    semi: ['error', 'never'],
    'brace-style': ['error', 'stroustrup', {
      allowSingleLine: false,
    }],
    'object-curly-newline': 'off',
    'arrow-parens': ['error', 'always'],
    'prefer-arrow-callback': ['error', {
      allowNamedFunctions: true,
      allowUnboundThis: true,
    }],
    'space-before-function-paren': ['error', {
      anonymous: 'never',
      named: 'never',
      asyncArrow: 'always',
    }],
    'no-underscore-dangle': 'off',
    'comma-dangle': ['error', {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'ignore',
    }],
  },
}
