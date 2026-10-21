FROM php:8.2-apache

RUN docker-php-ext-install pdo_mysql \
    && mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && printf '%s\n' 'upload_max_filesize=3M' 'post_max_size=4M' 'expose_php=Off' \
        > "$PHP_INI_DIR/conf.d/pan-clasico.ini"

ENV PORT=10000

RUN sed -i 's/Listen 80/Listen ${PORT}/' /etc/apache2/ports.conf \
    && sed -i 's/:80>/:${PORT}>/' /etc/apache2/sites-available/000-default.conf \
    && sed -i 's#DocumentRoot /var/www/html#DocumentRoot /var/www/html/public#' /etc/apache2/sites-available/000-default.conf \
    && printf '%s\n' \
        'ServerTokens Prod' \
        'ServerSignature Off' \
        'Alias /php /var/www/html/php' \
        '<Directory /var/www/html/public>' \
        '    Options -Indexes' \
        '</Directory>' \
        '<Directory /var/www/html/php>' \
        '    Options -Indexes' \
        '</Directory>' \
        '<Directory /var/www/html/php/config>' \
        '    Require all denied' \
        '</Directory>' \
        '<Directory /var/www/html/php/includes>' \
        '    Require all denied' \
        '</Directory>' \
        > /etc/apache2/conf-available/pan-clasico.conf \
    && a2enconf pan-clasico

COPY php /var/www/html/php
COPY public /var/www/html/public

RUN mkdir -p /var/www/html/public/img/productos \
    && chown -R www-data:www-data /var/www/html/public/img

EXPOSE 10000