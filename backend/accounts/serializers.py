from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "name", "role", "is_active", "created_at")


class UserShortSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "name", "full_name", "role")

    def get_full_name(self, obj):
        return obj.name or obj.email


class CreateUserSerializer(serializers.ModelSerializer):
    # пароль принимаем с фронта, но наружу не выдаём
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ("id", "email", "name", "password", "role")

    def create(self, validated_data):
        # создаём через менеджер, чтобы пароль захэшировался
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        return user
