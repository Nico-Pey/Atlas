# /storage — la persistance (expo-sqlite)

Seul endroit du code qui parle SQL. Tout le reste de l'app passe par les
fonctions exportées ici, jamais par une requête écrite en dur dans un écran.

Ce qu'on stocke : l'état SRS de chaque carte (vue le…, prochaine révision le…,
nombre de réussites/échecs). Le contenu des cartes, lui, vient de `/data`.

Pas de backend en V1 : tout reste sur l'iPhone.
