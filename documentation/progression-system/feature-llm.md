# Progression System LLM Guide

## Overview

## Components

- `achievement_definitions`: Primary source of truth for achievement metadata.
- `achievements`: Junction table linking users to achievements they've earned.
- `player_progression`: Stores user-specific progression metrics (total XP, current level).

## Code Structure

- `src/db/schema/achievement_definitions.ts`: Table definition and metadata schema.
- `src/db/schema/achievements.ts`: Relation definitions and earned achievement tracking.
- `src/db/schema/player_progression.ts`: Player state and statistics.
- `src/db/schema/index.ts`: Central hub for all schema relations.

## Relations

- Users have a one-to-one relationship with `player_progression`.
- Users have a many-to-many relationship with `achievement_definitions` through the `achievements` junction table.
- `achievements` belong to one `user` and one `achievement_definition`.
