import type { User, UserId } from "./types";

export const USERS: Record<UserId, User> = {
  nelson: {
    id: "nelson",
    name: "Nelson",
    lastName: "Barrera",
    initials: "NB",
    color: "var(--color-nelson)",
  },
  estela: {
    id: "estela",
    name: "Estela",
    lastName: "Barrera",
    initials: "ES",
    color: "var(--color-estela)",
  },
  fatima: {
    id: "fatima",
    name: "Fátima",
    lastName: "Barrera",
    initials: "FS",
    color: "var(--color-fatima)",
  },
};

export const USER_LIST = Object.values(USERS);
export const ALL_USERS: UserId[] = ["nelson", "estela", "fatima"];
