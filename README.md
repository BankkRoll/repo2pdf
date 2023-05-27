# MusicMind

MusicMind is an innovative music application that utilizes AI technology to generate unique and creative songs. Whether you're a musician looking for inspiration or simply enjoy discovering new music, MusicMind provides an exciting platform to explore AI-generated songs tailored to your preferences.

## In Progress
 MusicMind is currently in the process of development and building out the platform.
- [Example Site Here](https://musicmind.vercel.app/)

- [x] Implement Resemble AI
- [x] Implement User Auth
- [ ] Move All APIs To Routes 
- [ ] Implement User Payment For Token Usage ( ex. stripe )
- [ ] Complete UI/UX Design. Intuitive, User-Friendly Interface. Resemble/Ideas From Spotify/Youtube But Own Distint Layouts
- [ ] Implementing DB to store songs ( this will replace the current testing apis )
- [ ] Implementing a feedback system for users to rate and review songs 
- [ ] Implementing a system for users to create and share their custom AI models for music generation

If you're interested in contributing to MusicMind, please visit our [Contributing Guidelines](/README.md#contributing).

## Expected Future Features

- Generate AI-powered songs based on user input and preferences.
- Customize the style, emotion, and other parameters of the generated songs.
- Allow users to create and share their custom AI models for music generation
- Collaborate with other users to create collaborative AI-generated songs.
- Explore a vast library of AI-generated songs and playlists.
- Discover new and emerging artists through AI-curated recommendations.

## Installation

Follow these steps to set up MusicMind locally:

1. Clone the repository:

```bash
git clone https://github.com/BankkRoll/musicmind.git
```

2. Install the dependencies:

```bash
cd musicmind
npm install
```

3. Configure the environment variables:

Create a `.env` file in the root directory and specify the necessary environment variables. For example:

```plaintext
# https://clerk.com/
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=xxxxxxxxx
CLERK_SECRET_KEY=xxxxxxxxx

# https://www.resemble.ai/api/
RESEMBLE_API_TOKEN=xxxxxxxxxx
```

4. Start the development server:

```bash
npm run dev
```

The application will start running on `http://localhost:3000`.

## Contributing

We welcome contributions to MusicMind! If you'd like to contribute, please follow these guidelines:

1. Fork the repository and create your branch:

```bash
git checkout -b my-feature
```

2. Make your changes and commit them:

```bash
git commit -m "Add new feature"
```

## License

Repo-to-PDF is open source software, licensed under the MIT License. See the [LICENSE](/LICENSE) file for more information.