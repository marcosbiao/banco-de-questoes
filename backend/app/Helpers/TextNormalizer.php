<?php

namespace App\Helpers;

class TextNormalizer
{
    public static function normalize(string $value): string
    {
        $text = mb_strtolower($value, 'UTF-8');
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
        $normalized = preg_replace('/[^a-z0-9]+/', ' ', $ascii ?: $text) ?: '';

        return trim(preg_replace('/\s+/', ' ', $normalized) ?: '');
    }

    public static function slug(string $value): string
    {
        return str_replace(' ', '-', self::normalize($value));
    }
}
