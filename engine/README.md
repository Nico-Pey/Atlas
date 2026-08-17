# /engine — le moteur de répétition espacée (SRS)

Module **pur** : aucun import React, aucun accès à la base, aucune date lue
en cachette. On lui donne un état et une date, il retourne un nouvel état.

Pourquoi cette contrainte : c'est le cœur de l'app, et un module pur se lit,
se raisonne et se teste sans lancer le téléphone.

Règle du moteur (détail complet dans `.claude/skills/moteur-srs/`) :
- une carte n'entre dans le pool du quiz qu'après avoir été vue en leçon ;
- réussie → elle ressort du pool pendant **3 jours** ;
- ratée → elle revient dès **le lendemain**.
