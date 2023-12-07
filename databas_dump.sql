-- Skapa databasen --
CREATE DATABASE `api-bas`;

-- Skapa användartabellen --
CREATE TABLE `api-bas`.`users` ( 
    `id` INT(11) NOT NULL AUTO_INCREMENT, 
    `firstname` VARCHAR(100) NOT NULL,  
    `lastname` VARCHAR(100) NOT NULL, 
    `username` VARCHAR(50) NOT NULL, 
    `password` VARCHAR(100) NOT NULL,  
    `email` VARCHAR(75) NOT NULL, 
    PRIMARY KEY (`id`)) 
    ENGINE = InnoDB;

    -- Se html angående information om vilka som är authorizede + hjälp vad man ska klista in i insomnia --