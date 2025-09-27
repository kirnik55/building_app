import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class Roles(models.TextChoices):
    ENGINEER = "engineer", "Инженер"
    MANAGER = "manager", "Менеджер"
    LEAD = "lead", "Руководитель/Заказчик"
    ADMIN = "admin", "Админ"


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email обязателен")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # отключаем username и используем email
    username = None
    email = models.EmailField(unique=True)

    name = models.CharField(max_length=120, blank=True)
    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.ENGINEER)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []  # при createsuperuser запросит только email и пароль

    objects = UserManager()  # <-- наш менеджер

    def __str__(self):
        return self.email
