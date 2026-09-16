UPDATE profile_fields
SET options_json = '[
    {"value":"musculation","label":"Musculation"},
    {"value":"hiit","label":"HIIT"},
    {"value":"yoga","label":"Yoga"},
    {"value":"pilates","label":"Pilates"},
    {"value":"rehab","label":"Réathlétisation"},
    {"value":"nutrition","label":"Nutrition"},
    {"value":"crossfit","label":"CrossFit"},
    {"value":"cardio","label":"Cardio training"},
    {"value":"course_a_pied","label":"Course à pied"},
    {"value":"natation","label":"Natation"},
    {"value":"boxe","label":"Boxe"},
    {"value":"mma","label":"MMA / Kickboxing"},
    {"value":"cyclisme","label":"Cyclisme / Spinning"},
    {"value":"zumba","label":"Zumba"},
    {"value":"danse","label":"Danse fitness"},
    {"value":"stretching","label":"Stretching & mobilité"},
    {"value":"prep_physique","label":"Préparation physique"},
    {"value":"powerlifting","label":"Powerlifting"},
    {"value":"halterophilie","label":"Haltérophilie"},
    {"value":"street_workout","label":"Street workout"},
    {"value":"trail","label":"Trail running"},
    {"value":"hyrox","label":"HYROX"},
    {"value":"trx","label":"TRX / Suspension"},
    {"value":"aquagym","label":"Aquagym"},
    {"value":"pole_dance","label":"Pole dance"},
    {"value":"gymnastique","label":"Gymnastique"},
    {"value":"athletisme","label":"Athlétisme"},
    {"value":"coaching_seniors","label":"Coaching seniors"},
    {"value":"coaching_prenatal","label":"Coaching prénatal / postnatal"},
    {"value":"coaching_enfants","label":"Coaching enfants"},
    {"value":"perte_de_poids","label":"Perte de poids"},
    {"value":"prise_de_masse","label":"Prise de masse"},
    {"value":"remise_en_forme","label":"Remise en forme générale"},
    {"value":"arts_martiaux","label":"Arts martiaux"},
    {"value":"recuperation","label":"Récupération & mobilité"},
    {"value":"functional_training","label":"Functional training"}
]'
WHERE field_key = 'specialties';

UPDATE profile_fields
SET options_json = '{"items":[
    {"key":"language","label":"Langue","type":"select","required":true,"options":[
        {"value":"francais","label":"Français"},
        {"value":"anglais","label":"Anglais"},
        {"value":"arabe","label":"Arabe"},
        {"value":"espagnol","label":"Espagnol"},
        {"value":"italien","label":"Italien"},
        {"value":"allemand","label":"Allemand"},
        {"value":"portugais","label":"Portugais"},
        {"value":"russe","label":"Russe"},
        {"value":"chinois","label":"Chinois (mandarin)"},
        {"value":"japonais","label":"Japonais"},
        {"value":"coreen","label":"Coréen"},
        {"value":"turc","label":"Turc"},
        {"value":"neerlandais","label":"Néerlandais"},
        {"value":"suedois","label":"Suédois"},
        {"value":"norvegien","label":"Norvégien"},
        {"value":"danois","label":"Danois"},
        {"value":"finnois","label":"Finnois"},
        {"value":"polonais","label":"Polonais"},
        {"value":"grec","label":"Grec"},
        {"value":"hebreu","label":"Hébreu"},
        {"value":"hindi","label":"Hindi"},
        {"value":"ourdou","label":"Ourdou"},
        {"value":"farsi","label":"Persan (Farsi)"},
        {"value":"roumain","label":"Roumain"},
        {"value":"ukrainien","label":"Ukrainien"},
        {"value":"tcheque","label":"Tchèque"},
        {"value":"hongrois","label":"Hongrois"},
        {"value":"vietnamien","label":"Vietnamien"},
        {"value":"thai","label":"Thaï"},
        {"value":"indonesien","label":"Indonésien"},
        {"value":"malais","label":"Malais"},
        {"value":"swahili","label":"Swahili"},
        {"value":"amharique","label":"Amharique"},
        {"value":"tamazight","label":"Tamazight / Berbère"},
        {"value":"wolof","label":"Wolof"}
    ]},
    {"key":"level","label":"Niveau","type":"select","required":true,"options":[
        {"value":"a1","label":"A1"},
        {"value":"a2","label":"A2"},
        {"value":"b1","label":"B1"},
        {"value":"b2","label":"B2"},
        {"value":"c1","label":"C1"},
        {"value":"c2","label":"C2"},
        {"value":"native","label":"Natif"}
    ]}
]}'
WHERE field_key = 'spoken_languages';

UPDATE profile_fields
SET field_type = 'TAGS',
    placeholder = 'Coller un lien YouTube ou Vimeo',
    help_text = 'Un lien par vidéo — aucun fichier à envoyer.',
    accept = NULL
WHERE field_key = 'presentation_videos';
