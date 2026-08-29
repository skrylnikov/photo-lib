## ADDED Requirements

### Requirement: Галерея предоставляет responsive derivative candidates

Для каждого формата публичная галерея SHALL передавать браузеру все доступные размеры derivative с корректными width descriptors и SHALL сообщать ожидаемый rendered size кадра. Fallback image MUST также иметь responsive candidates, чтобы браузер не был вынужден загружать самый большой derivative для небольшого кадра.

#### Scenario: Небольшой кадр отображается на обычном экране
- **WHEN** gallery frame занимает небольшую часть viewport и для формата доступны варианты 640, 1280 и 2560 px
- **THEN** markup содержит все width candidates и точный `sizes`, позволяя браузеру выбрать вариант меньше 2560 px

#### Scenario: Кадр отображается на high-density экране
- **WHEN** фактическая плотность и rendered size требуют более крупного ресурса
- **THEN** браузер может выбрать подходящий 1280 или 2560 px candidate без изменения fallback-порядка форматов
