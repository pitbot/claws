# Space Station Bomberman 🚀💣

A browser-based game inspired by Super Bomberman, set in a space station with unique vacuum breach mechanics!

## Features

### Core Gameplay
- Classic Bomberman-style grid-based gameplay
- Place bombs to destroy walls and obstacles
- Navigate through a space station environment

### Unique Vacuum Mechanics
When a bomb explodes within 3 squares of a window, the window breaks and creates a **vacuum breach**:

- **Distance 0-3 squares**: Instant death! The pull is too strong to escape - you get sucked into space
- **Distance 4-10 squares**: Progressive vacuum pull that gets weaker with distance
  - You can escape by moving away from the breach
  - If you stand still, you'll be gradually pulled toward the breach
  - The closer you are, the stronger the pull

### Space Station Theme
- Metal walls and corridors
- Windows showing outer space with stars
- Destructible cargo crates
- Astronaut player character
- Space-themed visual effects

## Controls

- **Arrow Keys**: Move your astronaut
- **Space**: Place bomb
- **R**: Restart game

## How to Play

1. Open `index.html` in a web browser
2. Use arrow keys to navigate the space station
3. Press Space to place bombs
4. Destroy walls to create paths
5. **AVOID**: Getting caught in explosions or vacuum breaches!
6. Survive with your 3 lives

## Technical Details

Built with:
- HTML5 Canvas for rendering
- Vanilla JavaScript for game logic
- CSS3 for UI styling
- Real-time particle system for effects
- Grid-based collision detection
- Dynamic vacuum physics simulation

## Game Mechanics

### Grid System
- 20x15 tile grid
- Permanent walls (indestructible)
- Destructible crates
- Windows on outer walls (20% spawn rate)

### Bombs
- 2-second fuse timer
- Explosion spreads in 4 directions
- Range of 2 tiles
- Limited to 1 bomb at a time (default)

### Vacuum Breaches
- Created when bombs destroy windows
- Pull strength decreases with distance
- Creates particle effects showing air being sucked out
- Permanent once created

### Lives
- Start with 3 lives
- Lose a life when caught in explosion
- Lose a life when sucked into space
- Game over when all lives are lost

## Future Enhancements

Possible additions:
- Multiplayer support
- AI enemies (space aliens?)
- Power-ups (extra bombs, increased range, speed boost)
- Multiple levels
- Score system
- Breach repair power-up
- Sound effects and music

## License

Free to use and modify!
