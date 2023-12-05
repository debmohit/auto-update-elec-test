module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: [
      './latest-linux.yml'
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        authors: "Mohit",
        description: "Sample test",
          repository: {
            owner: "debmohit",
            name: "auto-update-elec-test"
          },
        prerelease: false,
        draft: false,
      }
    }
  ]
};
