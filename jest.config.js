module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { tsconfig: { module: "commonjs", target: "es2020", lib: ["es2020", "dom"], strict: true, esModuleInterop: true, types: ["jest", "node"] } },
    ],
  },
  collectCoverageFrom: ["utils/**/*.ts", "app/api/prontuarios/**/*.ts"],
};