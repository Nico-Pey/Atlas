/**
 * Une anecdote par département, affichée dans la fiche d'une leçon.
 *
 * Pourquoi ce fichier existe à part : `data/geo/france.json` est **généré**
 * par tools/build-geo.mjs à partir des données IGN/INSEE. Y glisser du texte
 * écrit à la main le ferait disparaître à la première régénération. Ici, le
 * contenu est écrit à la main et le reste — c'est le fichier à ouvrir pour
 * corriger ou remplacer une anecdote, une ligne par département.
 *
 * Ce qu'on cherche : un crochet pour la mémoire, pas une fiche encyclopédique.
 * Une bonne anecdote tient en une phrase, et si possible relie le département
 * à sa préfecture — c'est ce que le quiz demande. Les pièges administratifs
 * (la préfecture de la Marne n'est pas Reims) valent largement une curiosité.
 *
 * Ces textes ne sont pas interrogés au quiz : ils servent à retenir, pas à
 * être récités.
 */

/** @type {Record<string, string>} */
export const ANECDOTE_BY_DEPARTEMENT = {
  '01': "Bourg-en-Bresse est la capitale du poulet de Bresse, la seule volaille au monde protégée par une AOP.",
  '02': "Laon perche sa cathédrale sur une butte isolée : on la repère à des kilomètres au milieu de la plaine.",
  '03': "Moulins fut la capitale des ducs de Bourbon ; Vichy est dans le même département.",
  '04': "Digne-les-Bains a vu mourir Alexandra David-Néel, première Européenne entrée dans Lhassa interdite.",
  '05': "Gap est la préfecture la plus haute de France, à plus de 700 mètres d’altitude.",
  '06': "Nice a sa promenade des Anglais ; le festival de Cannes se tient dans le même département.",
  '07': "Privas vit du marron glacé ; l’Ardèche abrite la grotte Chauvet et ses peintures préhistoriques.",
  '08': "Arthur Rimbaud est né à Charleville-Mézières, qui accueille le festival mondial des marionnettes.",
  '09': "Le château des comtes de Foix dresse ses trois tours sur un piton, juste au-dessus de la ville.",
  '10': "Le centre de Troyes a la forme d’un bouchon de champagne — on l’appelle vraiment « le bouchon ».",
  '11': "La cité de Carcassonne, restaurée par Viollet-le-Duc, est l’une des plus grandes villes fortifiées d’Europe.",
  '12': "Rodez a son musée Soulages ; l’Aveyron a le viaduc de Millau et les caves de Roquefort.",
  '13': "Marseille, fondée vers 600 av. J.-C. par des marins grecs, est la plus ancienne ville de France.",
  '14': "Caen garde le tombeau de Guillaume le Conquérant ; c’est aussi le département du Débarquement.",
  '15': "Aurillac se remplit chaque mois d’août pour son festival international de théâtre de rue.",
  '16': "Angoulême accueille chaque hiver le Festival international de la bande dessinée.",
  '17': "La Rochelle garde l’entrée de son vieux port entre deux tours ; Fort Boyard est au large.",
  '18': "La cathédrale de Bourges n’a pas de transept, cas rare ; la ville a son festival, le Printemps.",
  '19': "Tulle abrite la dernière manufacture d’accordéons de France.",
  '21': "La moutarde de Dijon ; la Côte-d’Or aligne ses grands crus de Bourgogne sur un seul coteau.",
  '22': "Saint-Brieuc ouvre sur une baie aux marées parmi les plus fortes d’Europe ; plus loin, le granit devient rose.",
  '23': "Guéret veille sur un parc à loups ; la Creuse est l’un des départements les moins peuplés de France.",
  '24': "Lascaux est en Dordogne, le département du foie gras, de la truffe et des grottes ornées.",
  '25': "Victor Hugo est né à Besançon, que la citadelle de Vauban surveille depuis son rocher.",
  '26': "À Valence commence le Midi ; le nougat de Montélimar se fabrique un peu plus au sud.",
  '27': "Le jardin de Monet à Giverny est dans l’Eure, dont Évreux est la préfecture.",
  '28': "La cathédrale de Chartres a son « bleu de Chartres », une couleur de vitrail jamais retrouvée depuis.",
  '29': "Finistère veut dire « bout de la terre » ; Quimper est réputée pour sa faïence.",
  '2A': "Napoléon est né à Ajaccio, préfecture de la Corse-du-Sud.",
  '2B': "Bastia doit son nom à la « bastiglia », la citadelle génoise qui domine son vieux port.",
  '30': "Nîmes a des arènes romaines encore utilisées ; le pont du Gard est à quelques kilomètres.",
  '31': "Toulouse, la ville rose : ses briques, et les chaînes d’assemblage d’Airbus.",
  '32': "Le vrai d’Artagnan est né dans le Gers ; sa statue veille sur l’escalier monumental d’Auch.",
  '33': "Bordeaux et son « port de la Lune » ; la dune du Pilat, la plus haute d’Europe, est en Gironde.",
  '34': "Montpellier a l’une des plus anciennes facultés de médecine du monde, toujours en activité.",
  '35': "Saint-Malo est en Ille-et-Vilaine ; Rennes garde l’ancien parlement de Bretagne.",
  '36': "George Sand a écrit ses romans à Nohant, dans l’Indre, à une trentaine de kilomètres de Châteauroux.",
  '37': "Léonard de Vinci a fini sa vie à Amboise, en Indre-et-Loire ; Tours est la porte des châteaux.",
  '38': "Grenoble a accueilli les Jeux d’hiver de 1968 ; ses « bulles » montent à la Bastille.",
  '39': "Rouget de Lisle, l’auteur de La Marseillaise, est né à Lons-le-Saunier.",
  '40': "La forêt des Landes est la plus grande forêt artificielle d’Europe de l’Ouest, plantée pour fixer les sables.",
  '41': "Chambord et son escalier à double révolution sont en Loir-et-Cher, près de Blois.",
  '42': "Saint-Étienne, ville de la Manufacture d’armes et des Verts, le club le plus titré du championnat.",
  '43': "Au Puy-en-Velay, une chapelle est perchée sur une aiguille volcanique ; c’est un départ vers Compostelle.",
  '44': "Jules Verne est né à Nantes, où un éléphant mécanique promène aujourd’hui les visiteurs.",
  '45': "Orléans fête chaque printemps Jeanne d’Arc, qui y leva le siège anglais en 1429.",
  '46': "Le pont Valentré de Cahors dresse trois tours au-dessus du Lot ; Rocamadour est plus au nord.",
  '47': "Le pruneau d’Agen est une prune venue de Damas, acclimatée puis séchée en Lot-et-Garonne.",
  '48': "La Lozère est le département le moins peuplé de France : c’est l’ancien pays de la bête du Gévaudan.",
  '49': "Le château d’Angers déroule la tenture de l’Apocalypse, la plus grande tapisserie médiévale conservée.",
  '50': "Le Mont-Saint-Michel est dans la Manche, pas en Bretagne — une vieille dispute de voisinage.",
  '51': "La préfecture de la Marne est Châlons-en-Champagne, pas Reims : le piège classique.",
  '52': "De Gaulle s’est retiré à Colombey-les-Deux-Églises, en Haute-Marne, où il est enterré.",
  '53': "Le Douanier Rousseau, peintre de jungles qu’il n’a jamais vues, est né à Laval.",
  '54': "La place Stanislas de Nancy et ses grilles dorées, offertes par un roi de Pologne devenu duc de Lorraine.",
  '55': "À Bar-le-Duc, on épépine les groseilles à la plume d’oie ; Verdun est dans le même département.",
  '56': "Morbihan veut dire « petite mer » en breton ; les alignements de Carnac sont tout près de Vannes.",
  '57': "La cathédrale de Metz, « lanterne du Bon Dieu », a l’une des plus grandes surfaces de vitraux d’Europe.",
  '58': "Le circuit de Magny-Cours, longtemps hôte du Grand Prix de France, est à côté de Nevers.",
  '59': "La braderie de Lille, début septembre, est l’un des plus grands marchés aux puces d’Europe.",
  '60': "Le chœur de la cathédrale de Beauvais est le plus haut du monde gothique — et elle n’a jamais été achevée.",
  '61': "Le village de Camembert est dans l’Orne ; Alençon, elle, est célèbre pour sa dentelle.",
  '62': "Arras aligne deux grandes places à arcades flamandes, reconstruites à l’identique après 1918.",
  '63': "Clermont-Ferrand, ville de Michelin, est posée au pied d’une chaîne de quatre-vingts volcans.",
  '64': "Henri IV est né au château de Pau ; la légende dit qu’on lui frotta les lèvres d’ail et de jurançon.",
  '65': "Lourdes et le pic du Midi sont dans les Hautes-Pyrénées, dont Tarbes est la préfecture.",
  '66': "Salvador Dalí a proclamé la gare de Perpignan « centre du monde » : c’est écrit sur place.",
  '67': "Strasbourg accueille le Parlement européen et le plus ancien marché de Noël de France.",
  '68': "Bartholdi, le sculpteur de la statue de la Liberté, est né à Colmar, où sa maison se visite.",
  '69': "Les frères Lumière ont tourné le premier film à Lyon, qui s’illumine chaque 8 décembre.",
  '70': "« J’ai vu Vesoul » : la chanson de Jacques Brel a rendu la préfecture de la Haute-Saône célèbre.",
  '71': "L’abbaye de Cluny, longtemps la plus grande église de la chrétienté, est en Saône-et-Loire.",
  '72': "Les 24 Heures du Mans se courent en partie sur des routes ouvertes à tous le reste de l’année.",
  '73': "Chambéry a sa fontaine des Éléphants ; la Savoie a accueilli les Jeux d’Albertville en 1992.",
  '74': "Le mont Blanc et le lac d’Annecy sont dans le même département, la Haute-Savoie.",
  '75': "Paris est à la fois la ville, le département et la capitale : un cas unique en France.",
  '76': "Jeanne d’Arc a été brûlée à Rouen ; les falaises d’Étretat sont dans le même département.",
  '77': "Fontainebleau et Disneyland Paris sont en Seine-et-Marne, mais la préfecture reste Melun.",
  '78': "Versailles s’est construite autour du château de Louis XIV, qui y installa toute la cour.",
  '79': "Niort est la capitale française des mutuelles d’assurance ; le Marais poitevin est tout près.",
  '80': "La cathédrale d’Amiens est la plus vaste de France ; Jules Verne a vécu et est mort dans la ville.",
  '81': "La cathédrale d’Albi est le plus grand édifice de brique au monde ; Toulouse-Lautrec y est né.",
  '82': "Le peintre Ingres est né à Montauban, qui lui consacre son musée.",
  '83': "La rade de Toulon abrite le premier port militaire de France ; Saint-Tropez est dans le Var.",
  '84': "Les papes ont régné depuis Avignon pendant près de soixante-dix ans, au XIVe siècle.",
  '85': "La Roche-sur-Yon a été dessinée d’un trait par Napoléon ; le Vendée Globe part des Sables-d’Olonne.",
  '86': "Le Futuroscope est aux portes de Poitiers, dans la Vienne.",
  '87': "La porcelaine de Limoges est née d’un gisement de kaolin découvert tout près, en Haute-Vienne.",
  '88': "Une « image d’Épinal » vient vraiment d’Épinal, où l’imagerie fonctionne depuis le XVIIIe siècle.",
  '89': "Le chablis et la colline de Vézelay sont dans l’Yonne, dont Auxerre est la préfecture.",
  '90': "Le plus petit département hors Île-de-France ; son lion de pierre est signé Bartholdi.",
  '91': "Évry-Courcouronnes accueille l’arène de l’équipe d’e-sport Karmine Corp.",
  '92': "La Défense déborde sur Nanterre, préfecture des Hauts-de-Seine, où se dresse sa grande arène.",
  '93': "Les rois de France sont enterrés à la basilique de Saint-Denis ; le Stade de France est juste à côté.",
  '94': "Rungis, le plus grand marché de produits frais du monde, est dans le Val-de-Marne.",
  '95': "Van Gogh a passé ses derniers mois à Auvers-sur-Oise, dans le Val-d’Oise, où il est enterré.",
};

/**
 * @param {string} code Numéro de département ("40", "2A"…).
 * @returns {string | null} null si le département n'a pas encore d'anecdote.
 */
export function findAnecdote(code) {
  return ANECDOTE_BY_DEPARTEMENT[code] ?? null;
}
