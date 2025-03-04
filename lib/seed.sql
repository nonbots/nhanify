--insert users into users table 
INSERT INTO
  users (username, password)
VALUES
 /* (
    'a',
    '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
  ), -- user1password
  */
  (
    'username1',
    '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
  ), -- user1password
  (
    'username2',
    '$2a$10$usDBfagJthfpsBuKzKml8OxwMhYilQmhlqPgb9s5ZRL2CQmVwIIRy'
  ), -- user2password
  (
    'username3',
    '$2a$10$I7W1NEs.LA6Yqls0hP7XOezfFuq6ZL4PYAscYdcV3j/GKyfx9G1wC'
  ), -- user3password 
  (
    'username4',
    '$2a$10$Ys4wO1EueQsMiRf1cW5VduPz4MpN98rolmuP2eufnW9ktwZR4gBhS'
  ), -- user4password 
  (
    'username5',
    '$2a$10$cjmOHXGv8ku4FKni5E9JGud3K.bhe1X9Q5g3vRg.0HMSj3fBG1fy.'
  ), -- user5password 
  (
    'username6',
    '$2a$10$cKNnwbpI0EqT.pOUBk66qOunzbJ7EZJgLTRlR/R836NUOvbqwCauS'
  );
  /*
  (
    'username7',
    '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
  ), -- user1password
  (
    'username8',
    '$2a$10$usDBfagJthfpsBuKzKml8OxwMhYilQmhlqPgb9s5ZRL2CQmVwIIRy'
  ), -- user2password
  (
    'username9',
    '$2a$10$I7W1NEs.LA6Yqls0hP7XOezfFuq6ZL4PYAscYdcV3j/GKyfx9G1wC'
  ), -- user3password 
  (
    'username10',
    '$2a$10$Ys4wO1EueQsMiRf1cW5VduPz4MpN98rolmuP2eufnW9ktwZR4gBhS'
  ), -- user4password 
  (
    'username11',
    '$2a$10$cjmOHXGv8ku4FKni5E9JGud3K.bhe1X9Q5g3vRg.0HMSj3fBG1fy.'
  ), -- user5password 
  (
    'username12',
    '$2a$10$cKNnwbpI0EqT.pOUBk66qOunzbJ7EZJgLTRlR/R836NUOvbqwCauS'
  ),
(
    'username13',
    '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
  ), -- user1password
  (
    'username14',
    '$2a$10$usDBfagJthfpsBuKzKml8OxwMhYilQmhlqPgb9s5ZRL2CQmVwIIRy'
  ), -- user2password
  (
    'username15',
    '$2a$10$I7W1NEs.LA6Yqls0hP7XOezfFuq6ZL4PYAscYdcV3j/GKyfx9G1wC'
  ), -- user3password 
  (
    'username16',
    '$2a$10$Ys4wO1EueQsMiRf1cW5VduPz4MpN98rolmuP2eufnW9ktwZR4gBhS'
  ), -- user4password 
  (
    'username17',
    '$2a$10$cjmOHXGv8ku4FKni5E9JGud3K.bhe1X9Q5g3vRg.0HMSj3fBG1fy.'
  ), -- user5password 
  (
    'username18',
    '$2a$10$cKNnwbpI0EqT.pOUBk66qOunzbJ7EZJgLTRlR/R836NUOvbqwCauS'
  ), 
  (
    'username19',
    '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
  ), -- user1password
  (
    'username20',
    '$2a$10$usDBfagJthfpsBuKzKml8OxwMhYilQmhlqPgb9s5ZRL2CQmVwIIRy'
  ), -- user2password
  (
    'username21',
    '$2a$10$I7W1NEs.LA6Yqls0hP7XOezfFuq6ZL4PYAscYdcV3j/GKyfx9G1wC'
  ), -- user3password 
  (
    'username22',
    '$2a$10$Ys4wO1EueQsMiRf1cW5VduPz4MpN98rolmuP2eufnW9ktwZR4gBhS'
  ), -- user4password 
  (
    'username23',
    '$2a$10$cjmOHXGv8ku4FKni5E9JGud3K.bhe1X9Q5g3vRg.0HMSj3fBG1fy.'
  ), -- user5password 
  (
    'username24',
    '$2a$10$cKNnwbpI0EqT.pOUBk66qOunzbJ7EZJgLTRlR/R836NUOvbqwCauS'
  ), 
  (
    'username25',
    '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
  ), -- user1password
  (
    'username26',
    '$2a$10$usDBfagJthfpsBuKzKml8OxwMhYilQmhlqPgb9s5ZRL2CQmVwIIRy'
  ), -- user2password
  (
    'username27',
    '$2a$10$I7W1NEs.LA6Yqls0hP7XOezfFuq6ZL4PYAscYdcV3j/GKyfx9G1wC'
  ), -- user3password 
  (
    'username28',
    '$2a$10$Ys4wO1EueQsMiRf1cW5VduPz4MpN98rolmuP2eufnW9ktwZR4gBhS'
  ), -- user4password 
  (
    'username29',
    '$2a$10$cjmOHXGv8ku4FKni5E9JGud3K.bhe1X9Q5g3vRg.0HMSj3fBG1fy.'
  ), -- user5password 
  (
    'username30',
    '$2a$10$cKNnwbpI0EqT.pOUBk66qOunzbJ7EZJgLTRlR/R836NUOvbqwCauS'
  ), 
  (
    'username31',
    '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
  ), -- user1password
  (
    'username32',
    '$2a$10$usDBfagJthfpsBuKzKml8OxwMhYilQmhlqPgb9s5ZRL2CQmVwIIRy'
  ), -- user2password
  (
    'username33',
    '$2a$10$I7W1NEs.LA6Yqls0hP7XOezfFuq6ZL4PYAscYdcV3j/GKyfx9G1wC'
  ), -- user3password 
  (
    'username34',
    '$2a$10$Ys4wO1EueQsMiRf1cW5VduPz4MpN98rolmuP2eufnW9ktwZR4gBhS'
  ), -- user4password 
  (
    'username35',
    '$2a$10$cjmOHXGv8ku4FKni5E9JGud3K.bhe1X9Q5g3vRg.0HMSj3fBG1fy.'
  ), -- user5password 
  (
    'username36',
    '$2a$10$cKNnwbpI0EqT.pOUBk66qOunzbJ7EZJgLTRlR/R836NUOvbqwCauS'
  ),
(
    'username37',
    '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
  ), -- user1password
  (
    'username38',
    '$2a$10$I7W1NEs.LA6Yqls0hP7XOezfFuq6ZL4PYAscYdcV3j/GKyfx9G1wC'
  ), -- user3password 
  (
    'username39',
    '$2a$10$Ys4wO1EueQsMiRf1cW5VduPz4MpN98rolmuP2eufnW9ktwZR4gBhS'
  ), -- user4password 
  (
    'username40',
    '$2a$10$cjmOHXGv8ku4FKni5E9JGud3K.bhe1X9Q5g3vRg.0HMSj3fBG1fy.'
  ), -- user5password 
  (
    'username41',
    '$2a$10$cKNnwbpI0EqT.pOUBk66qOunzbJ7EZJgLTRlR/R836NUOvbqwCauS'
  ), 
  (
    'username42',
    '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
  ), -- user1password
  (
    'username43',
    '$2a$10$usDBfagJthfpsBuKzKml8OxwMhYilQmhlqPgb9s5ZRL2CQmVwIIRy'
  ), -- user2password
  (
    'username44',
    '$2a$10$I7W1NEs.LA6Yqls0hP7XOezfFuq6ZL4PYAscYdcV3j/GKyfx9G1wC'
  ), -- user3password 
  (
    'username45',
    '$2a$10$Ys4wO1EueQsMiRf1cW5VduPz4MpN98rolmuP2eufnW9ktwZR4gBhS'
  ), -- user4password 
  (
    'username46',
    '$2a$10$cjmOHXGv8ku4FKni5E9JGud3K.bhe1X9Q5g3vRg.0HMSj3fBG1fy.'
  ), -- user5password 
  (
    'username47',
    '$2a$10$cKNnwbpI0EqT.pOUBk66qOunzbJ7EZJgLTRlR/R836NUOvbqwCauS'
  ),
  (
    'username48', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username49', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username50', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username51', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username52', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username53', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username54', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username55', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username56', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username57', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username58', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username59', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username60', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username61', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username62', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username63', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username64', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username65', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username66', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username67', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username68', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username69', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username70', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username71', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username72', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username73', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username74', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username75', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username76', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username77', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username78', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username79', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username80', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username81', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username82', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username83', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username84', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username85', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username86', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username87', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username88', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username89', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username90', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username91', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username92', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username93', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username94', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username95', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username96', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username97', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username98', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username99', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username100', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username101', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username102', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username103', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username104', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username105', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username106', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username107', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username108', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username109', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username110', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username111', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username112', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username113', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username114', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username115', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username116', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username117', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username118', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username119', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username120', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username121', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username122', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username123', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username124', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username125', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
),
(
    'username126', '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
)
;*/
  

-- user6password 
--insert playlists into the playlists table
INSERT INTO
  playlists (title, creator_id, private)
VALUES
  ('Lofi', 1, false),
  ('Gym', 1, false),
  ('Chill & Relaxing', 1, false),
  ('Party', 1, false),
  ('Coding', 1, false),
  ('Christmas Jams', 1, false),
  ('Twitch Stream', 1, false),
  ('Focus Study', 2, false),
  ('Dance Class', 3, false),
  ('Date Night', 4, true),
  ('Summer Jam', 5, true);

--insert reference to users and playlist into playlists-users table
INSERT INTO
  playlists_users (contributor_id, playlist_id)
VALUES
  (1, 8),
  (1, 9),
  (1, 11),
  (2, 7),
  (3, 7),
  (4, 7),
  (5, 7),
  (6, 7),
  (2, 1);

--insert songs into the songs table
INSERT INTO
  songs (title, video_id, playlist_id, creator_id)
VALUES
  ('Chilling In Tokyo', 'y7qZFji19Rg', 1, 1),
  ('Good Days', 'L9VcK_pT1Y4', 1, 1),
  ('Just With My Guitar', 'M0ecZFXs-VM', 1, 1),
  ('Spring Nights', 'InZxeDWR-hQ', 1, 1),
  ('Eternal Youth', '_BWPNPtsZm8', 1, 1),
  ('Blankets', 'HdXrkgZP438', 1, 1),
  ('Dreaming', 'DFVuYoDVS_g', 1, 2),
  ('Pink - Raise Your Glass', 'XjVNlG5cZyQ', 2, 2),
  (
    'Kudasaibeats - The Girl I Haven''t Met',
    'XDpoBc8t6gE',
    7,
    3
  ),
  (
    'Miley Cyrus - Party In The USA',
    'M11SvDtPBhA',
    4,
    4
  ),
  ('Mad Animal - L.A. Dreamin', 'leannVmCjeo', 5, 5),
  (
    'Christmas, Why Can''t Find You?',
    'T-urD17dbDU',
    6,
    6
  ),
  (
    'The Darkness - Love is Only a Feeling',
    'QSGa1dW_KoE',
    7,
    6
  ),
  ('Blue Heart', 'Dui7KB8y-Ro', 7, 6),
  (
    'Chúng Ta Không Thuộc Về Nhau',
    'qGRU3sRbaYw',
    7,
    1
  ),
  (
    'Jacob Collier - Little Blue',
    'IQvzX0Z3HE4',
    7,
    2
  ),
  ('Stick Figure - Paradise', 'qvzFphdCYHo', 7, 3),
  ('Queen - Under Pressure', 'a01QQZyl-_I', 7, 4),
  ('Watermelon Man', '_QkGAaYtXA0', 7, 5),
  ('XX-Intro', 'QbwdJl8TGeY', 7, 1),
  (
    'Should I Stay or Should I Go',
    'BN1WwnEDWAM',
    7,
    1
  );
